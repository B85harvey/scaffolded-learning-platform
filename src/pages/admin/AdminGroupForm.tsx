import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getLessonById } from '@/lessons'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: string
  name: string
}

interface GroupMember {
  studentId: string
  isScribe: boolean
}

interface GroupRow {
  id: string
  name: string
  members: GroupMember[]
}

// ── GroupCard ─────────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: GroupRow
  unassigned: Student[]
  onNameChange: (name: string) => void
  onAddStudent: (studentId: string) => void
  onRemoveStudent: (studentId: string) => void
  onSetScribe: (studentId: string) => void
  allStudents: Student[]
}

function GroupCard({
  group,
  unassigned,
  onNameChange,
  onAddStudent,
  onRemoveStudent,
  onSetScribe,
  allStudents,
}: GroupCardProps) {
  const [addingId, setAddingId] = useState('')

  function studentName(id: string): string {
    return allStudents.find((s) => s.id === id)?.name ?? id
  }

  return (
    <div data-testid={`group-card-${group.id}`} className="rounded-lg bg-ga-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <label className="sr-only" htmlFor={`group-name-${group.id}`}>
          Group name
        </label>
        <input
          id={`group-name-${group.id}`}
          data-testid={`group-name-${group.id}`}
          type="text"
          value={group.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Group name"
          className="flex-1 rounded-md border border-ga-border px-3 py-1.5 font-sans text-sm text-ga-text focus:outline-none focus:ring-2 focus:ring-ga-blue/50"
        />
      </div>

      {/* Members */}
      <ul className="mb-4 space-y-2">
        {group.members.map((m) => (
          <li key={m.studentId} className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-sm text-ga-text">
              <input
                type="radio"
                name={`scribe-${group.id}`}
                data-testid={`scribe-radio-${group.id}-${m.studentId}`}
                checked={m.isScribe}
                onChange={() => onSetScribe(m.studentId)}
                className="accent-ga-primary"
              />
              {studentName(m.studentId)}
            </label>
            <button
              type="button"
              data-testid={`remove-member-${group.id}-${m.studentId}`}
              onClick={() => onRemoveStudent(m.studentId)}
              className="text-xs text-ga-textMuted hover:text-ga-danger"
            >
              Remove
            </button>
          </li>
        ))}
        {group.members.length === 0 && (
          <li className="text-xs italic text-ga-textMuted">No students assigned.</li>
        )}
      </ul>

      {/* Add student */}
      {unassigned.length > 0 && (
        <div className="flex gap-2">
          <select
            data-testid={`add-student-select-${group.id}`}
            value={addingId}
            onChange={(e) => setAddingId(e.target.value)}
            className="flex-1 rounded-md border border-ga-border px-2 py-1 font-sans text-sm text-ga-text"
          >
            <option value="">Select student…</option>
            {unassigned.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid={`add-student-btn-${group.id}`}
            disabled={!addingId}
            onClick={() => {
              if (addingId) {
                onAddStudent(addingId)
                setAddingId('')
              }
            }}
            className="rounded-md bg-ga-blue px-3 py-1 text-xs font-semibold text-white hover:bg-ga-blue-dark disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ── AdminGroupForm ────────────────────────────────────────────────────────────

export function AdminGroupForm() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const { session } = useAuth()

  const [classId, setClassId] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const teacherId = session?.user.id ?? null
  const lesson = lessonId ? getLessonById(lessonId) : undefined

  useEffect(() => {
    if (!teacherId || !lessonId) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        // 1. Teacher's class.
        const { data: classRow } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', teacherId!)
          .maybeSingle()

        const cid = classRow?.id ?? null
        setClassId(cid)

        if (!cid) {
          setLoading(false)
          return
        }

        // 2. Students in the class.
        const { data: members } = await supabase
          .from('class_members')
          .select('student_id')
          .eq('class_id', cid)

        const studentIds = (members ?? []).map((m) => m.student_id).filter(Boolean) as string[]

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', studentIds.length > 0 ? studentIds : ['__none__'])

        const studentsLoaded: Student[] = (profiles ?? []).map((p) => ({
          id: p.id,
          name: p.display_name ?? p.email,
        }))
        setStudents(studentsLoaded)

        // 3. Existing groups for this lesson.
        const { data: existingGroups } = await supabase
          .from('groups')
          .select('id, group_name')
          .eq('lesson_id', lessonId!)
          .eq('class_id', cid)

        if (!existingGroups || existingGroups.length === 0) {
          setLoading(false)
          return
        }

        const groupIds = existingGroups.map((g) => g.id)

        const { data: existingMembers } = await supabase
          .from('group_members')
          .select('group_id, student_id, is_scribe')
          .in('group_id', groupIds)

        const groupRows: GroupRow[] = existingGroups.map((g) => ({
          id: g.id,
          name: g.group_name,
          members: (existingMembers ?? [])
            .filter((m) => m.group_id === g.id)
            .map((m) => ({ studentId: m.student_id!, isScribe: m.is_scribe })),
        }))

        setGroups(groupRows)
      } catch {
        setError('Could not load group data.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [teacherId, lessonId])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function assignedIds(): Set<string> {
    return new Set(groups.flatMap((g) => g.members.map((m) => m.studentId)))
  }

  function unassignedFor(): Student[] {
    const assigned = assignedIds()
    return students.filter((s) => !assigned.has(s.id))
  }

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Group ${prev.length + 1}`, members: [] },
    ])
  }

  function updateGroupName(groupId: string, name: string) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)))
  }

  function addMember(groupId: string, studentId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, members: [...g.members, { studentId, isScribe: false }] } : g
      )
    )
  }

  function removeMember(groupId: string, studentId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, members: g.members.filter((m) => m.studentId !== studentId) } : g
      )
    )
  }

  function setScribe(groupId: string, studentId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.map((m) => ({ ...m, isScribe: m.studentId === studentId })),
            }
          : g
      )
    )
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!classId || !lessonId) return

    const errors: string[] = []
    const assigned = assignedIds()

    // All students must be assigned.
    for (const s of students) {
      if (!assigned.has(s.id)) {
        errors.push(`${s.name} is not assigned to a group.`)
      }
    }

    // Each group must have exactly one scribe.
    for (const g of groups) {
      const scribes = g.members.filter((m) => m.isScribe)
      const label = g.name.trim() || 'Unnamed group'
      if (scribes.length === 0) {
        errors.push(`"${label}" has no scribe selected.`)
      } else if (scribes.length > 1) {
        errors.push(`"${label}" has multiple scribes.`)
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setSaving(true)
    setError('')

    try {
      const groupRows = groups.map((g) => ({
        id: g.id,
        lesson_id: lessonId!,
        class_id: classId,
        group_name: g.name,
      }))

      const { error: groupErr } = await supabase
        .from('groups')
        .upsert(groupRows, { onConflict: 'id' })

      if (groupErr) {
        setError(`Could not save groups: ${groupErr.message}`)
        return
      }

      const memberRows = groups.flatMap((g) =>
        g.members.map((m) => ({
          group_id: g.id,
          student_id: m.studentId,
          is_scribe: m.isScribe,
        }))
      )

      const { error: memberErr } = await supabase
        .from('group_members')
        .upsert(memberRows, { onConflict: 'group_id,student_id' })

      if (memberErr) {
        setError(`Could not save group members: ${memberErr.message}`)
        return
      }

      setSaveSuccess(true)
    } catch {
      setError('Something went wrong saving groups.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <SkipToContent />
      <AppNav />
      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 font-sans text-2xl font-semibold text-ga-text">
            {lesson?.title ?? lessonId}
          </h1>
          <p className="mb-8 text-sm text-ga-textMuted">Manage student groups</p>

          {error && (
            <p className="mb-4 text-sm text-ga-danger" role="alert">
              {error}
            </p>
          )}

          {validationErrors.length > 0 && (
            <ul
              data-testid="validation-errors"
              role="alert"
              className="mb-4 space-y-1 rounded-lg border border-ga-danger/40 bg-ga-danger/5 px-4 py-3"
            >
              {validationErrors.map((e, i) => (
                <li key={i} className="text-sm text-ga-danger">
                  {e}
                </li>
              ))}
            </ul>
          )}

          {saveSuccess && (
            <p data-testid="save-success" className="mb-4 text-sm text-ga-success" role="status">
              Groups saved successfully.
            </p>
          )}

          {loading ? (
            <p className="text-sm text-ga-textMuted" role="status">
              Loading…
            </p>
          ) : (
            <>
              <div className="space-y-4">
                {groups.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    unassigned={unassignedFor()}
                    allStudents={students}
                    onNameChange={(name) => updateGroupName(g.id, name)}
                    onAddStudent={(sid) => addMember(g.id, sid)}
                    onRemoveStudent={(sid) => removeMember(g.id, sid)}
                    onSetScribe={(sid) => setScribe(g.id, sid)}
                  />
                ))}

                {groups.length === 0 && (
                  <p className="text-sm text-ga-textMuted">No groups yet. Add one below.</p>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  data-testid="add-group-btn"
                  onClick={addGroup}
                  className="rounded-md border border-ga-border px-4 py-2 text-sm font-medium text-ga-text hover:border-ga-primary"
                >
                  + Add group
                </button>
                <button
                  type="button"
                  data-testid="save-groups-btn"
                  disabled={saving || groups.length === 0}
                  onClick={() => void handleSave()}
                  className="rounded-md bg-ga-primary px-4 py-2 text-sm font-semibold text-white hover:bg-ga-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save groups'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
