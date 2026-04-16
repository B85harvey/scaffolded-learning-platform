import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getLessonById } from '@/lessons'
import { getUnitById } from '@/lessons/units'
import type { LessonConfig } from '@/lessons/types'
import type { LessonStatusResult } from '@/lib/completionCalc'

// ── LessonCard ────────────────────────────────────────────────────────────────

interface LessonCardProps {
  lesson: LessonConfig
  progress: LessonStatusResult
  unitClosed: boolean
  studentId: string | null
}

function LessonCard({ lesson, progress, unitClosed, studentId }: LessonCardProps) {
  const { status, currentSlideIndex } = progress
  const totalSlides = lesson.slides.length

  const badge = () => {
    if (status === 'complete') {
      return (
        <span
          data-testid="status-complete"
          className="flex items-center gap-1 rounded-full bg-ga-success/10 px-2.5 py-0.5 text-xs font-medium text-ga-success"
        >
          <CheckCircle2 size={12} aria-hidden="true" />
          Complete
        </span>
      )
    }
    if (status === 'in_progress') {
      return (
        <span
          data-testid="status-in-progress"
          className="rounded-full bg-ga-amber/10 px-2.5 py-0.5 text-xs font-medium text-ga-amber-solid"
        >
          In progress
        </span>
      )
    }
    return (
      <span className="rounded-full bg-ga-border px-2.5 py-0.5 text-xs font-medium text-ga-textMuted">
        Not started
      </span>
    )
  }

  const progressLine = () => {
    if (status === 'in_progress') {
      return (
        <p data-testid="slide-progress" className="mt-1 text-xs text-ga-textMuted">
          Slide {currentSlideIndex + 1} of {totalSlides}
        </p>
      )
    }
    if (status === 'complete') {
      return (
        <Link
          to={`/session/${lesson.id}/${studentId ?? ''}`}
          data-testid="action-plan-link"
          className="mt-1 block rounded-sm text-xs font-medium text-ga-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-1"
        >
          View Summary
        </Link>
      )
    }
    return null
  }

  const inner = (
    <div
      data-testid={`lesson-card-${lesson.id}`}
      className={[
        'rounded-lg bg-ga-card p-5 shadow-card',
        unitClosed ? 'opacity-60' : 'transition-shadow hover:shadow-card-hover',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-ga-text">{lesson.title}</h3>
        {badge()}
      </div>
      {progressLine()}
    </div>
  )

  if (unitClosed) {
    return <div aria-disabled="true">{inner}</div>
  }

  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
    >
      {inner}
    </Link>
  )
}

// ── UnitView ──────────────────────────────────────────────────────────────────

export function UnitView() {
  const { unitId } = useParams<{ unitId: string }>()
  const { session } = useAuth()

  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonStatusResult>>({})
  const [unitClosed, setUnitClosed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const unit = unitId ? getUnitById(unitId) : undefined
  const lessons = (unit?.lessonIds ?? [])
    .map((id) => getLessonById(id))
    .filter(Boolean) as LessonConfig[]

  const studentId = session?.user.id ?? null

  useEffect(() => {
    if (!studentId || !unit) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        // 1. Resolve student's class.
        const { data: membership } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', studentId!)
          .maybeSingle()

        const classId = membership?.class_id

        // 2. Check unit assignment status.
        if (classId) {
          const { data: assignment } = await supabase
            .from('unit_assignments')
            .select('status')
            .eq('unit_id', unit!.id)
            .eq('class_id', classId)
            .maybeSingle()

          setUnitClosed(assignment?.status === 'closed')
        }

        // 3. Batch-fetch lesson progress for all lessons in the unit.
        if (unit!.lessonIds.length > 0) {
          const { data: progressRows } = await supabase
            .from('lesson_progress')
            .select('lesson_id, status, current_slide_index')
            .eq('student_id', studentId!)
            .in('lesson_id', unit!.lessonIds)

          const map: Record<string, LessonStatusResult> = {}
          for (const row of progressRows ?? []) {
            if (row.lesson_id) {
              map[row.lesson_id] = {
                status: row.status,
                currentSlideIndex: row.current_slide_index,
              }
            }
          }
          setLessonProgress(map)
        }
      } catch {
        setError('Could not load unit data.')
      } finally {
        setLoading(false)
      }
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, unit?.id])

  if (!unit) {
    return (
      <>
        <AppNav />
        <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg">
          <p className="text-sm text-ga-textMuted">Unit not found.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <SkipToContent />
      <AppNav />
      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-2xl">
          {/* Back arrow */}
          <Link
            to="/home"
            className="mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-ga-textMuted hover:text-ga-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to home
          </Link>

          <h1 className="mb-6 font-sans text-2xl font-semibold text-ga-text">{unit.title}</h1>

          {/* Closed banner */}
          {unitClosed && (
            <div
              role="alert"
              data-testid="unit-closed-banner"
              className="mb-6 rounded-lg border border-ga-border bg-ga-card p-4 text-sm text-ga-textMuted"
            >
              This unit is closed. Your completed work is still visible below.
            </div>
          )}

          {loading && (
            <p className="text-sm text-ga-textMuted" role="status">
              Loading lessons…
            </p>
          )}

          {error && (
            <p className="text-sm text-ga-danger" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <div className="space-y-4">
              {lessons.map((lesson) => {
                const progress = lessonProgress[lesson.id] ?? {
                  status: 'not_started' as const,
                  currentSlideIndex: 0,
                }
                return (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    progress={progress}
                    unitClosed={unitClosed}
                    studentId={studentId}
                  />
                )
              })}

              {lessons.length === 0 && (
                <p className="text-sm text-ga-textMuted">No lessons in this unit yet.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
