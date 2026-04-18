/**
 * TeacherLessonsPage — lesson library at /teacher/lessons.
 *
 * Lists all lessons owned by the current teacher with title, slide count,
 * and last-edited relative date. Supports Edit, Duplicate, and Delete actions.
 *
 * Protected via TeacherLayout (AdminRoute) in App.tsx.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Presentation } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbLesson {
  id: string
  title: string
  updated_at: string
}

interface LessonRow {
  id: string
  title: string
  slideCount: number
  updatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TeacherLessonsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [lessons, setLessons] = useState<LessonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LessonRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Incrementing this key triggers a lesson list reload.
  const [refreshKey, setRefreshKey] = useState(0)

  // ── Load lessons ────────────────────────────────────────────────────────────

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) return

    let cancelled = false

    async function load() {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, updated_at')
        .eq('created_by', userId!)
        .order('updated_at', { ascending: false })

      if (cancelled) return

      const dbLessons = (lessonsData ?? []) as DbLesson[]
      const lessonIds = dbLessons.map((l) => l.id)

      const slideCounts: Record<string, number> = {}
      if (lessonIds.length > 0) {
        const { data: slidesData } = await supabase
          .from('slides')
          .select('lesson_id')
          .in('lesson_id', lessonIds)

        if (!cancelled) {
          for (const row of (slidesData ?? []) as Array<{ lesson_id: string }>) {
            slideCounts[row.lesson_id] = (slideCounts[row.lesson_id] ?? 0) + 1
          }
        }
      }

      if (!cancelled) {
        setLessons(
          dbLessons.map((l) => ({
            id: l.id,
            title: l.title,
            slideCount: slideCounts[l.id] ?? 0,
            updatedAt: l.updated_at,
          }))
        )
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [session, refreshKey])

  // ── Create lesson ───────────────────────────────────────────────────────────

  async function handleCreate() {
    const userId = session?.user.id
    if (!userId || creating) return
    setCreating(true)

    const slug = `untitled-${crypto.randomUUID().slice(0, 8)}`
    const { data, error } = await supabase
      .from('lessons')
      .insert({ slug, title: 'Untitled lesson', created_by: userId })
      .select('id')
      .single()

    if (error || !data) {
      setCreating(false)
      return
    }
    navigate(`/teacher/lessons/${(data as { id: string }).id}/edit`)
  }

  // ── Duplicate lesson ────────────────────────────────────────────────────────

  async function handleDuplicate(lesson: LessonRow) {
    const userId = session?.user.id
    if (!userId || duplicating) return
    setDuplicating(lesson.id)

    // Fetch original slides
    const { data: slidesData } = await supabase
      .from('slides')
      .select('sort_order, type, config')
      .eq('lesson_id', lesson.id)
      .order('sort_order')

    // Insert new lesson with "(copy)" suffix
    const slug = `copy-${crypto.randomUUID().slice(0, 8)}`
    const { data: newLesson, error } = await supabase
      .from('lessons')
      .insert({
        slug,
        title: `${lesson.title} (copy)`,
        created_by: userId,
      })
      .select('id')
      .single()

    if (error || !newLesson) {
      setDuplicating(null)
      return
    }

    const newLessonId = (newLesson as { id: string }).id

    // Batch-insert copied slides, preserving sort_order
    const slides = (slidesData ?? []) as Array<{
      sort_order: number
      type: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: any
    }>
    if (slides.length > 0) {
      await supabase.from('slides').insert(
        slides.map((s) => ({
          lesson_id: newLessonId,
          sort_order: s.sort_order,
          type: s.type as 'content' | 'mcq' | 'scaffold' | 'review',
          config: s.config,
        }))
      )
    }

    setDuplicating(null)
    navigate(`/teacher/lessons/${newLessonId}/edit`)
  }

  // ── Delete lesson ───────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)

    // Delete slides first in case cascade is not configured
    await supabase.from('slides').delete().eq('lesson_id', deleteTarget.id)
    await supabase.from('lessons').delete().eq('id', deleteTarget.id)

    setDeleteTarget(null)
    setDeleting(false)
    setRefreshKey((k) => k + 1)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div data-testid="lesson-library" className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-sans text-2xl font-semibold text-ga-ink">My Lessons</h1>
        <button
          type="button"
          data-testid="create-lesson-btn"
          onClick={() => void handleCreate()}
          disabled={creating}
          className={cn(
            'rounded-ga-sm bg-ga-primary px-4 py-2 font-sans text-sm font-medium text-white',
            'transition-colors hover:bg-ga-primary-dark disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
          )}
        >
          {creating ? 'Creating…' : 'Create lesson'}
        </button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-ga-border-subtle border-t-ga-primary"
            aria-label="Loading…"
            aria-busy="true"
          />
        </div>
      ) : lessons.length === 0 ? (
        /* Empty state */
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center gap-4 py-24 text-center"
        >
          <p className="font-sans text-base text-ga-ink-muted">No lessons yet.</p>
          <button
            type="button"
            data-testid="empty-create-btn"
            onClick={() => void handleCreate()}
            disabled={creating}
            className={cn(
              'rounded-ga-sm bg-ga-primary px-5 py-2 font-sans text-sm font-medium text-white',
              'transition-colors hover:bg-ga-primary-dark disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
            )}
          >
            {creating ? 'Creating…' : 'Create lesson'}
          </button>
        </div>
      ) : (
        /* Lesson table */
        <table data-testid="lessons-table" className="w-full border-collapse font-sans text-sm">
          <thead>
            <tr className="border-b border-ga-border text-left">
              <th className="pb-3 pr-6 font-semibold text-ga-ink">Title</th>
              <th className="pb-3 pr-6 font-semibold text-ga-ink">Slides</th>
              <th className="pb-3 pr-6 font-semibold text-ga-ink">Last edited</th>
              <th className="pb-3 font-semibold text-ga-ink">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr
                key={lesson.id}
                data-testid={`lesson-row-${lesson.id}`}
                className="border-b border-ga-border-subtle hover:bg-ga-surface-muted"
              >
                <td
                  className="py-3 pr-6 font-medium text-ga-ink"
                  data-testid={`lesson-title-${lesson.id}`}
                >
                  {lesson.title}
                </td>
                <td
                  className="py-3 pr-6 text-ga-ink-muted"
                  data-testid={`lesson-slides-${lesson.id}`}
                >
                  {lesson.slideCount}
                </td>
                <td
                  className="py-3 pr-6 text-ga-ink-muted"
                  data-testid={`lesson-updated-${lesson.id}`}
                >
                  {relativeDate(lesson.updatedAt)}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/teacher/dashboard/${lesson.id}`}
                      aria-label={`Open dashboard for ${lesson.title}`}
                      data-testid={`dashboard-btn-${lesson.id}`}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded text-ga-ink-muted',
                        'hover:bg-ga-surface-muted hover:text-ga-ink',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
                      )}
                    >
                      <BarChart3 size={16} aria-hidden="true" />
                    </Link>
                    <Link
                      to={`/teacher/livewall/${lesson.id}`}
                      aria-label={`Open live wall for ${lesson.title}`}
                      data-testid={`livewall-btn-${lesson.id}`}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded text-ga-ink-muted',
                        'hover:bg-ga-surface-muted hover:text-ga-ink',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
                      )}
                    >
                      <Presentation size={16} aria-hidden="true" />
                    </Link>
                    <Link
                      to={`/teacher/lessons/${lesson.id}/edit`}
                      data-testid={`edit-btn-${lesson.id}`}
                      className={cn(
                        'rounded px-3 py-1 font-sans text-sm font-medium text-ga-primary',
                        'hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
                      )}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      data-testid={`duplicate-btn-${lesson.id}`}
                      onClick={() => void handleDuplicate(lesson)}
                      disabled={duplicating === lesson.id}
                      className={cn(
                        'rounded px-3 py-1 font-sans text-sm text-ga-ink-muted',
                        'hover:text-ga-ink disabled:opacity-50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
                      )}
                    >
                      {duplicating === lesson.id ? 'Duplicating…' : 'Duplicate'}
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-btn-${lesson.id}`}
                      onClick={() => setDeleteTarget(lesson)}
                      className={cn(
                        'rounded px-3 py-1 font-sans text-sm text-ga-danger',
                        'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-danger/50'
                      )}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          data-testid="delete-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-full max-w-sm rounded-ga-md bg-ga-card p-6 shadow-ga-md">
            <h2
              id="delete-dialog-title"
              className="mb-2 font-sans text-lg font-semibold text-ga-ink"
            >
              Delete lesson?
            </h2>
            <p className="mb-6 font-sans text-sm text-ga-ink-muted">
              Delete &ldquo;{deleteTarget.title}&rdquo;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                data-testid="delete-cancel-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className={cn(
                  'rounded-ga-sm px-4 py-2 font-sans text-sm font-medium text-ga-ink-muted',
                  'hover:text-ga-ink disabled:opacity-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="delete-confirm-btn"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className={cn(
                  'rounded-ga-sm bg-ga-danger px-4 py-2 font-sans text-sm font-medium text-white',
                  'transition-colors hover:opacity-80 disabled:opacity-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-danger/50'
                )}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
