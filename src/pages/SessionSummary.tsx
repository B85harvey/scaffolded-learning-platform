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
import { UNITS } from '@/lessons/units'
import { generateUnitReviewDocx } from '@/utils/generateUnitReviewDocx'
import { triggerDocxDownload } from '@/utils/triggerDownload'
import type { UnitReviewLesson, UnitReviewSection } from '@/utils/generateUnitReviewDocx'

// ── SessionSummary ────────────────────────────────────────────────────────────

export function SessionSummary() {
  const { lessonId, studentId: paramStudentId } = useParams<{
    lessonId: string
    studentId: string
  }>()
  const { session, profile, loading: authLoading } = useAuth()

  const [committed, setCommitted] = useState<Record<string, string | undefined>>({})
  const [studentName, setStudentName] = useState('')
  const [completionDate, setCompletionDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unitReviewDownloading, setUnitReviewDownloading] = useState(false)

  const lesson = lessonId ? getLessonById(lessonId) : undefined
  const isOwn = !authLoading && session?.user.id === paramStudentId
  const isTeacher = profile?.role === 'teacher'

  useEffect(() => {
    if ((!isOwn && !isTeacher) || !lessonId || !paramStudentId) {
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
  }, [isOwn, isTeacher, lessonId, paramStudentId])

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (!authLoading && !isOwn && !isTeacher) {
    return <Navigate to="/home" replace />
  }

  // ── Unit Review download (teacher only) ────────────────────────────────────
  const handleUnitReviewDownload = async () => {
    if (!lessonId || !paramStudentId || unitReviewDownloading) return
    setUnitReviewDownloading(true)

    try {
      const unit = UNITS.find((u) => u.lessonIds.includes(lessonId))
      if (!unit || unit.lessonIds.length === 0) return

      const { data: lessonRecords } = await supabase
        .from('lessons')
        .select('id, title, slug')
        .in('slug', unit.lessonIds)

      const dbLessons = (lessonRecords ?? []) as Array<{
        id: string
        title: string
        slug: string
      }>

      const unitLessons: UnitReviewLesson[] = await Promise.all(
        unit.lessonIds.map(async (slug) => {
          const dbLesson = dbLessons.find((l) => l.slug === slug)
          if (!dbLesson) return { lessonTitle: slug, sections: [] }

          const { data: slideData } = await supabase
            .from('slides')
            .select('id, sort_order, type, config')
            .eq('lesson_id', dbLesson.id)
            .eq('type', 'scaffold')
            .order('sort_order')

          type DbSlide = {
            id: string
            sort_order: number
            type: string
            config: {
              section?: string
              config?: { targetQuestion?: string; sectionHeading?: string }
            }
          }

          const scaffoldSlides = (slideData ?? []) as DbSlide[]
          if (scaffoldSlides.length === 0) {
            return { lessonTitle: dbLesson.title, sections: [] }
          }

          const slideIds = scaffoldSlides.map((s) => s.id)
          const { data: subData } = await supabase
            .from('lesson_submissions')
            .select('slide_id, committed_paragraph')
            .eq('student_id', paramStudentId!)
            .eq('lesson_id', dbLesson.id)
            .in('slide_id', slideIds)

          const submissionMap: Record<string, string> = {}
          for (const sub of (subData ?? []) as Array<{
            slide_id: string
            committed_paragraph: string | null
          }>) {
            submissionMap[sub.slide_id] = sub.committed_paragraph ?? ''
          }

          const sections: UnitReviewSection[] = scaffoldSlides.map((slide) => {
            const section = slide.config.section ?? ''
            const targetQ =
              slide.config.config?.targetQuestion ?? slide.config.config?.sectionHeading ?? ''
            const heading = targetQ ? `${section}: ${targetQ}` : section
            const raw = submissionMap[slide.id]
            return { heading, content: raw != null && raw !== '' ? raw : null }
          })

          return { lessonTitle: dbLesson.title, sections }
        })
      )

      const today = new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      const blob = await generateUnitReviewDocx({
        unitTitle: unit.title,
        studentName,
        date: today,
        lessons: unitLessons,
      })

      const safeUnit = unit.title.replace(/[/\\?%*:|"<>]/g, '-')
      const safeName = studentName.replace(/[/\\?%*:|"<>]/g, '-')
      triggerDocxDownload(blob, `${safeUnit} - ${safeName} - Unit Review.docx`)
    } finally {
      setUnitReviewDownloading(false)
    }
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
              {/* Action toolbar */}
              <div className="mb-6 flex items-center justify-end gap-3">
                {isTeacher && (
                  <button
                    type="button"
                    data-testid="unit-review-download-btn"
                    disabled={unitReviewDownloading}
                    onClick={() => void handleUnitReviewDownload()}
                    className={cn(
                      'rounded-ga-sm border border-ga-border-strong px-4 py-2 font-sans text-sm font-medium text-ga-text',
                      'transition-colors hover:border-ga-primary hover:text-ga-primary disabled:opacity-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2'
                    )}
                  >
                    {unitReviewDownloading ? 'Downloading…' : 'Download Unit Review'}
                  </button>
                )}
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
