/**
 * TeacherDashboard — MCQ class-check results at /teacher/dashboard/:lessonId.
 *
 * Shows a slide selector for all class-check MCQ slides in the lesson.
 * When a slide is selected the teacher can reveal a live McqBarChart that
 * updates in real time as student scribes submit their answers.
 *
 * Protected by AdminRoute (via TeacherLayout).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TeacherLayout } from '@/components/teacher/TeacherLayout'
import { McqBarChart } from '@/components/teacher/McqBarChart'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface McqOption {
  id: string
  text: string
  correct?: boolean
}

interface DashboardSlide {
  slideId: string
  question: string
  options: McqOption[]
}

interface McqSubmission {
  studentId: string
  promptAnswers: { selectedOption?: string } | null
}

interface DbSlide {
  id: string
  sort_order: number
  type: string
  config: {
    question?: string
    variant?: string
    options?: McqOption[]
  }
}

// ── Inner component (receives lessonId via router param) ──────────────────────

function TeacherDashboardInner() {
  const { lessonId } = useParams<{ lessonId: string }>()

  const [slides, setSlides] = useState<DashboardSlide[]>([])
  const [selectedSlide, setSelectedSlide] = useState<DashboardSlide | null>(null)
  const [submissions, setSubmissions] = useState<McqSubmission[]>([])
  const [isRevealed, setIsRevealed] = useState(false)
  const [loading, setLoading] = useState(true)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ── Fetch slides ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!lessonId) return

    let cancelled = false

    async function loadSlides() {
      const { data } = await supabase
        .from('slides')
        .select('id, sort_order, type, config')
        .eq('lesson_id', lessonId!)
        .order('sort_order')

      if (cancelled) return

      const mcqSlides: DashboardSlide[] = ((data ?? []) as DbSlide[])
        .filter(
          (s) =>
            s.type === 'mcq' &&
            (s.config as { variant?: string }).variant === 'class' &&
            Array.isArray((s.config as { options?: unknown }).options)
        )
        .map((s) => ({
          slideId: s.id,
          question:
            typeof (s.config as { question?: string }).question === 'string'
              ? (s.config as { question: string }).question
              : '',
          options: ((s.config as { options?: McqOption[] }).options ?? []).map((o) => ({
            id: o.id,
            text: o.text,
            correct: o.correct,
          })),
        }))

      if (!cancelled) {
        setSlides(mcqSlides)
        setSelectedSlide(mcqSlides[0] ?? null)
        setLoading(false)
      }
    }

    void loadSlides()
    return () => {
      cancelled = true
    }
  }, [lessonId])

  // ── Fetch submissions when slide changes ────────────────────────────────────

  useEffect(() => {
    if (!selectedSlide || !lessonId) return

    const slideId = selectedSlide.slideId
    let cancelled = false

    async function loadSubmissions() {
      if (!cancelled) {
        setSubmissions([])
        setIsRevealed(false)
      }

      const { data } = await supabase
        .from('lesson_submissions')
        .select('student_id, prompt_answers')
        .eq('lesson_id', lessonId!)
        .eq('slide_id', slideId)

      if (!cancelled) {
        const parsed: McqSubmission[] = (
          (data ?? []) as Array<{
            student_id: string | null
            prompt_answers: unknown
          }>
        )
          .filter((r) => r.student_id !== null)
          .map((r) => ({
            studentId: r.student_id as string,
            promptAnswers: r.prompt_answers as McqSubmission['promptAnswers'],
          }))
        setSubmissions(parsed)
      }
    }

    void loadSubmissions()
    return () => {
      cancelled = true
    }
  }, [selectedSlide, lessonId])

  // ── Realtime subscription ───────────────────────────────────────────────────

  useEffect(() => {
    if (!lessonId || !selectedSlide) return

    const slideId = selectedSlide.slideId

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`dashboard-${lessonId}-${slideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_submissions',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload: {
          new: {
            student_id: string | null
            slide_id: string
            prompt_answers: unknown
          }
        }) => {
          const row = payload.new
          if (row.slide_id !== slideId) return
          if (!row.student_id) return

          setSubmissions((prev) => {
            const idx = prev.findIndex((s) => s.studentId === row.student_id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = {
                ...next[idx],
                promptAnswers: row.prompt_answers as McqSubmission['promptAnswers'],
              }
              return next
            }
            return [
              ...prev,
              {
                studentId: row.student_id!,
                promptAnswers: row.prompt_answers as McqSubmission['promptAnswers'],
              },
            ]
          })
        }
      )
      .subscribe()

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase as any).removeChannel(channel)
    }
  }, [lessonId, selectedSlide])

  // ── Derived chart data ──────────────────────────────────────────────────────

  const counts = useMemo(() => {
    if (!selectedSlide) return []
    return selectedSlide.options.map(
      (opt) => submissions.filter((s) => s.promptAnswers?.selectedOption === opt.id).length
    )
  }, [selectedSlide, submissions])

  const total = useMemo(() => counts.reduce((sum, c) => sum + c, 0), [counts])

  const correctIndex = useMemo(() => {
    if (!selectedSlide) return 0
    const idx = selectedSlide.options.findIndex((o) => o.correct)
    return idx >= 0 ? idx : 0
  }, [selectedSlide])

  const optionTexts = useMemo(
    () => (selectedSlide ? selectedSlide.options.map((o) => o.text) : []),
    [selectedSlide]
  )

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectSlide = useCallback((slide: DashboardSlide) => {
    setSelectedSlide(slide)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div data-testid="teacher-dashboard" className="p-8">
      <h1 className="mb-6 font-sans text-2xl font-semibold text-ga-ink">Class-check results</h1>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-ga-border-strong border-t-ga-primary"
            aria-label="Loading…"
            aria-busy="true"
          />
        </div>
      ) : slides.length === 0 ? (
        <p className="font-sans text-sm italic text-ga-ink-muted">
          No class-check slides found for this lesson.
        </p>
      ) : (
        <>
          {/* Slide selector */}
          <nav
            aria-label="MCQ slide selector"
            data-testid="mcq-slide-selector"
            className="mb-8 flex gap-2 overflow-x-auto"
          >
            {slides.map((slide) => {
              const isActive = slide.slideId === selectedSlide?.slideId
              const label =
                slide.question.length > 40
                  ? slide.question.slice(0, 40) + '…'
                  : slide.question || 'Class check'
              return (
                <button
                  key={slide.slideId}
                  type="button"
                  data-testid={`mcq-slide-btn-${slide.slideId}`}
                  aria-pressed={isActive}
                  onClick={() => handleSelectSlide(slide)}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70',
                    isActive
                      ? 'bg-ga-primary text-white'
                      : 'bg-ga-surface-muted text-ga-ink-muted hover:bg-ga-border-subtle hover:text-ga-ink'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </nav>

          {/* Selected slide */}
          {selectedSlide && (
            <div>
              {/* Question */}
              <p
                data-testid="mcq-question"
                className="mb-6 font-sans text-lg font-semibold text-ga-ink"
              >
                {selectedSlide.question}
              </p>

              {/* Reveal / hide toggle */}
              {!isRevealed ? (
                <button
                  type="button"
                  data-testid="reveal-btn"
                  onClick={() => setIsRevealed(true)}
                  className="mb-6 rounded-ga-sm bg-ga-primary px-5 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-ga-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70"
                >
                  Reveal answers
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="hide-btn"
                  onClick={() => setIsRevealed(false)}
                  className="mb-6 rounded-ga-sm bg-ga-surface-muted px-5 py-2 font-sans text-sm font-medium text-ga-ink-muted transition-colors hover:bg-ga-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70"
                >
                  Hide answers
                </button>
              )}

              {/* Bar chart */}
              {isRevealed && (
                <McqBarChart
                  options={optionTexts}
                  counts={counts}
                  correctIndex={correctIndex}
                  total={total}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Exported page (wrapped in TeacherLayout which includes AdminRoute) ────────

export function TeacherDashboard() {
  return (
    <TeacherLayout>
      <TeacherDashboardInner />
    </TeacherLayout>
  )
}
