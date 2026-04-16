import { type FormEvent, useEffect, useState } from 'react'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteStatus = 'sent' | 'already_enrolled' | 'invalid'

interface InviteResult {
  email: string
  status: InviteStatus
}

interface ClassMember {
  studentId: string
  email: string
  displayName: string | null
  joinedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal email validation: must contain @ and at least one dot after it. */
function isValidEmail(email: string): boolean {
  const at = email.indexOf('@')
  if (at < 1) return false
  const domain = email.slice(at + 1)
  return domain.includes('.') && domain.length > 2
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminClassForm() {
  const { session } = useAuth()

  const [classId, setClassId] = useState<string | null>(null)
  const [className, setClassName] = useState('')
  const [members, setMembers] = useState<ClassMember[]>([])

  const [emailsText, setEmailsText] = useState('')
  const [results, setResults] = useState<InviteResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')

  // ── On mount: ensure the teacher has a class ──────────────────────────────
  useEffect(() => {
    if (!session?.user.id) return

    async function init() {
      const teacherId = session!.user.id

      // Find existing class for this teacher.
      const { data: existing, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .maybeSingle()

      if (error) {
        setLoadError('Could not load class data.')
        return
      }

      let id: string
      let name: string

      if (existing) {
        id = existing.id
        name = existing.name
      } else {
        // Create a default class on first visit.
        const { data: created, error: createError } = await supabase
          .from('classes')
          .insert({ teacher_id: teacherId, name: 'My Class' })
          .select('id, name')
          .maybeSingle()

        if (createError || !created) {
          setLoadError('Could not create class.')
          return
        }
        id = created.id
        name = created.name
      }

      setClassId(id)
      setClassName(name)
      await loadMembers(id)
    }

    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  async function loadMembers(id: string) {
    // Fetch class_members, then look up their profiles.
    const { data: memberRows } = await supabase
      .from('class_members')
      .select('student_id, joined_at')
      .eq('class_id', id)

    if (!memberRows?.length) return

    const studentIds = memberRows.map((r) => r.student_id).filter(Boolean) as string[]

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', studentIds)

    const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]))

    setMembers(
      memberRows.map((m) => {
        const p = profileMap.get(m.student_id ?? '')
        return {
          studentId: m.student_id ?? '',
          email: p?.email ?? '—',
          displayName: p?.display_name ?? null,
          joinedAt: m.joined_at,
        }
      })
    )
  }

  // ── Submit: validate, enrol, invite ──────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!classId) return

    setSubmitting(true)
    setResults([])

    const lines = emailsText.split('\n')
    const batch: InviteResult[] = []

    for (const line of lines) {
      const email = line.trim().toLowerCase()
      if (!email) continue

      if (!isValidEmail(email)) {
        batch.push({ email, status: 'invalid' })
        continue
      }

      // Check if this email already has an account.
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (profileData?.id) {
        // Check if already a class member.
        const { data: memberData } = await supabase
          .from('class_members')
          .select('id')
          .eq('class_id', classId)
          .eq('student_id', profileData.id)
          .maybeSingle()

        if (memberData) {
          batch.push({ email, status: 'already_enrolled' })
          continue
        }

        // Enrol the existing student.
        await supabase
          .from('class_members')
          .insert({ class_id: classId, student_id: profileData.id })
      }

      // Send magic-link invite regardless of whether the account exists yet.
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${import.meta.env.APP_URL ?? ''}/auth/callback` },
      })

      batch.push({ email, status: 'sent' })
    }

    setResults(batch)
    setSubmitting(false)

    // Reload the members table to reflect any new enrolments.
    await loadMembers(classId)
  }

  // ── Derived summary counts ────────────────────────────────────────────────
  const sentCount = results.filter((r) => r.status === 'sent').length
  const enrolledCount = results.filter((r) => r.status === 'already_enrolled').length
  const invalidCount = results.filter((r) => r.status === 'invalid').length
  const hasResults = results.length > 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <SkipToContent />
      <AppNav />
      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 font-sans text-2xl font-semibold text-ga-text">
            {className || 'Class'}
          </h1>
          <p className="mb-8 text-sm text-ga-textMuted">
            Invite students by email. Each email receives a magic-link sign-in.
          </p>

          {loadError && (
            <p role="alert" className="mb-6 text-sm text-ga-danger">
              {loadError}
            </p>
          )}

          {/* ── Invite form ─────────────────────────────────────────────── */}
          <div className="mb-8 rounded-lg bg-ga-card p-6 shadow-card">
            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="emails" className="mb-1 block text-sm font-medium text-ga-text">
                Student email addresses{' '}
                <span className="font-normal text-ga-textMuted">(one per line)</span>
              </label>
              <textarea
                id="emails"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                rows={6}
                placeholder={'student1@school.edu.au\nstudent2@school.edu.au'}
                className="mb-4 w-full rounded-md border border-ga-border bg-white px-3 py-2 font-mono text-sm text-ga-text placeholder:text-ga-textMuted focus-visible:border-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/30"
              />

              <button
                type="submit"
                disabled={submitting || !emailsText.trim() || !classId}
                className="rounded-md bg-ga-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ga-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send invites'}
              </button>
            </form>

            {/* ── Results summary ─────────────────────────────────────── */}
            {hasResults && (
              <div
                role="status"
                aria-live="polite"
                data-testid="invite-results"
                className="mt-5 rounded-md border border-ga-border bg-ga-bg p-4 text-sm"
              >
                {sentCount > 0 && (
                  <p className="text-ga-text">
                    <strong>{sentCount}</strong> {sentCount === 1 ? 'invite' : 'invites'} sent
                  </p>
                )}
                {enrolledCount > 0 && (
                  <p className="text-ga-textMuted">
                    <strong>{enrolledCount}</strong> already enrolled
                  </p>
                )}
                {invalidCount > 0 && (
                  <p className="text-ga-danger">
                    <strong>{invalidCount}</strong> invalid{' '}
                    {invalidCount === 1 ? 'email' : 'emails'} skipped
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Current members table ───────────────────────────────────── */}
          <div className="rounded-lg bg-ga-card p-6 shadow-card">
            <h2 className="mb-4 font-sans text-base font-semibold text-ga-text">
              Current members ({members.length})
            </h2>

            {members.length === 0 ? (
              <p className="text-sm text-ga-textMuted">No students enrolled yet.</p>
            ) : (
              <table className="w-full text-sm" aria-label="Class members">
                <thead>
                  <tr className="border-b border-ga-border text-left text-xs font-medium uppercase tracking-wide text-ga-textMuted">
                    <th className="pb-2 pr-4">Name / Email</th>
                    <th className="pb-2 pr-4">Joined</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.studentId} className="border-b border-ga-border last:border-0">
                      <td className="py-2.5 pr-4 text-ga-text">
                        {m.displayName ?? m.email}
                        {m.displayName && (
                          <span className="ml-1 text-ga-textMuted">({m.email})</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-ga-textMuted">
                        {new Date(m.joinedAt).toLocaleDateString('en-AU')}
                      </td>
                      <td className="py-2.5">
                        <span className="rounded-full bg-ga-success/10 px-2 py-0.5 text-xs font-medium text-ga-success">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
