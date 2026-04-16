import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getLessonById } from '@/lessons'
import { ActionPlanDocument, buildMarkdown } from '@/components/lesson/ActionPlanDocument'
import { toast, ToastRegion } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// ── SessionSummary ────────────────────────────────────────────────────────────

export function SessionSummary() {
  const { lessonId, studentId: paramStudentId } = useParams<{
    lessonId: string
    studentId: string
  }>()
  const { session, loading: authLoading } = useAuth()

  const [committed, setCommitted] = useState<Record<string, string | undefined>>({})
  const [studentName, setStudentName] = useState('')
  const [completionDate, setCompletionDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const lesson = lessonId ? getLessonById(lessonId) : undefined
  const isOwn = !authLoading && session?.user.id === paramStudentId

  useEffect(() => {
    if (!isOwn || !lessonId || !paramStudentId) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        // Fetch all submissions for this student + lesson.
        const { data: submissions, error: subErr } = await supabase
          .from('lesson_submissions')
          .select('section, committed_paragraph, committed_at')
          .eq('student_id', paramStudentId!)
          .eq('lesson_id', lessonId!)

        if (subErr) {
          setError('Could not load session data.')
          setLoading(false)
          return
        }

        const map: Record<string, string | undefined> = {}
        let latestAt: string | null = null

        for (const row of submissions ?? []) {
          if (row.section && row.committed_paragraph) {
            map[row.section] = row.committed_paragraph
            if (!latestAt || row.committed_at > latestAt) {
              latestAt = row.committed_at
            }
          }
        }

        setCommitted(map)
        setCompletionDate(latestAt)

        // Fetch student's display name.
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', paramStudentId!)
          .maybeSingle()

        setStudentName(profile?.display_name ?? profile?.email ?? '')
      } catch {
        setError('Something went wrong loading the session.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [isOwn, lessonId, paramStudentId])

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (!authLoading && !isOwn) {
    return <Navigate to="/home" replace />
  }

  // ── Copy All ───────────────────────────────────────────────────────────────
  const handleCopyAll = async () => {
    const markdown = buildMarkdown(committed)
    try {
      await navigator.clipboard.writeText(markdown)
      toast('Copied to clipboard', { variant: 'success' })
    } catch {
      toast('Copy failed — please try again', { variant: 'default' })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <SkipToContent />
      <AppNav />
      <ToastRegion />
      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/home"
            className="mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-ga-textMuted hover:text-ga-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-sans text-2xl font-semibold text-ga-text">
              {lesson?.title ?? lessonId}
            </h1>
            {studentName && <p className="mt-1 text-sm text-ga-textMuted">{studentName}</p>}
            {completionDate && (
              <p data-testid="completion-date" className="mt-0.5 text-xs text-ga-textMuted">
                Completed{' '}
                {new Date(completionDate).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {loading && (
            <p className="text-sm text-ga-textMuted" role="status">
              Loading…
            </p>
          )}

          {error && (
            <p className="text-sm text-ga-danger" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              {/* Copy All */}
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  aria-label="Copy all"
                  data-testid="copy-all-btn"
                  onClick={() => void handleCopyAll()}
                  className={cn(
                    'rounded-ga-sm border border-ga-border-strong px-4 py-2 font-sans text-sm font-medium text-ga-text',
                    'transition-colors hover:border-ga-primary hover:text-ga-primary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2'
                  )}
                >
                  Copy All
                </button>
              </div>

              <ActionPlanDocument committed={committed} emptyText="Not completed" />
            </>
          )}
        </div>
      </main>
    </>
  )
}
