import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLesson } from '@/contexts/LessonContext'
import type { LessonState } from '@/contexts/lessonReducer'
import { ActionPlanPanel } from './ActionPlanPanel'
import { DevToolbar } from './DevToolbar'
import { SaveStatusChip } from './SaveStatusChip'
import { ShortcutHelpDialog } from './ShortcutHelpDialog'
import { SlideFrame } from './SlideFrame'
import { SlideContent } from './slides/SlideContent'
import { SlideMcq } from './slides/SlideMcq'
import { SlideScaffold } from './slides/SlideScaffold'
import { SlideReview } from './slides/SlideReview'
import { ToastRegion, toast } from '@/components/ui/Toast'
import { useBackgroundSync } from '@/hooks/useBackgroundSync'
import { useLockSubscription } from '@/hooks/useLockSubscription'
import { useScribeLabel } from '@/hooks/useScribeLabel'
import { syncDirtyDrafts, updateProgress } from '@/lib/syncService'
import { hydrateLesson, hydrateLessonFromDexie } from '@/lib/hydrateLesson'
import { resolveResumeSlide } from '@/lib/resolveResumeSlide'
import { supabase } from '@/lib/supabase'
import type { LessonConfig, Section, SlideConfig } from '@/lessons/types'

// ── Section dot config ────────────────────────────────────────────────────────

const CONTENT_SECTIONS: { key: Section; label: string }[] = [
  { key: 'aim', label: 'Aim' },
  { key: 'issues', label: 'Issues' },
  { key: 'decision', label: 'Decision' },
  { key: 'justification', label: 'Justification' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'references', label: 'References' },
]

const SECTION_LABELS: Record<string, string> = {
  orientation: 'Orientation',
  aim: 'Aim',
  issues: 'Issues',
  decision: 'Decision',
  justification: 'Justification',
  implementation: 'Implementation',
  references: 'References',
  review: 'Review',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSlide(slide: SlideConfig) {
  switch (slide.type) {
    case 'content':
      return <SlideContent title={slide.title} body={slide.body} image={slide.image} />
    case 'mcq':
      return <SlideMcq slide={slide} />
    case 'scaffold':
      return <SlideScaffold slide={slide} />
    case 'review':
      return <SlideReview />
  }
}

/**
 * Returns true when the student may advance past the given slide.
 * Content and review slides are always passable. MCQ slides require a resolved
 * answer (correct or revealed). Scaffold slides require a committed paragraph.
 */
function slideCanAdvance(slide: SlideConfig, state: LessonState): boolean {
  switch (slide.type) {
    case 'content':
    case 'review':
      return true
    case 'mcq': {
      const answers = state.answers[slide.id]
      const mcqResult = answers?.kind === 'text' ? (answers.values['mcqResult'] ?? '') : ''
      return mcqResult === 'correct'
    }
    case 'scaffold':
      return state.committedSlideIds.includes(slide.id)
  }
}

// ── Progress dots ─────────────────────────────────────────────────────────────

interface DotsProps {
  currentSection: Section
  committedSections: Record<string, unknown>
}

function ProgressDots({ currentSection, committedSections }: DotsProps) {
  return (
    <div
      role="progressbar"
      aria-label="Lesson progress"
      aria-valuetext={`Section: ${SECTION_LABELS[currentSection] ?? currentSection}`}
      className="flex items-center gap-3"
    >
      {CONTENT_SECTIONS.map(({ key, label }) => {
        const isActive = key === currentSection
        const isVisited = Boolean(committedSections[key])

        return (
          <div
            key={key}
            title={label}
            aria-label={`${label}: ${isActive ? 'current' : isVisited ? 'done' : 'not started'}`}
            className={[
              'h-3 w-3 rounded-full transition-colors',
              isActive
                ? 'bg-ga-primary ring-2 ring-ga-primary ring-offset-2'
                : isVisited
                  ? 'bg-ga-ink-muted'
                  : 'border border-ga-border-strong bg-transparent',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}

// ── LessonShellInner — uses context ───────────────────────────────────────────

/** Returns true when the event target is a text-entry element. */
function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return target.isContentEditable
}

const COMMITTED_SECTIONS = [
  'aim',
  'issues',
  'decision',
  'justification',
  'implementation',
  'references',
] as const

function LessonShellInner({
  lesson,
  studentId,
}: {
  lesson: LessonConfig
  studentId: string | null
}) {
  const { state, dispatch } = useLesson()
  const scribeLabel = useScribeLabel(lesson.id, studentId)

  // Derived values — safe to compute before hooks (not hooks themselves).
  const currentSlide = state.slides[state.currentSlideIndex]
  const isLocked = Boolean(state.locks[currentSlide.id])
  const totalSlides = state.slides.length
  const slideNumber = state.currentSlideIndex + 1
  const canGoBack = state.currentSlideIndex > 0
  const canGoNext =
    state.currentSlideIndex < totalSlides - 1 && slideCanAdvance(currentSlide, state)
  const isDevMode = typeof window !== 'undefined' && window.location.search.includes('dev=1')

  // ── Hydration on mount ────────────────────────────────────────────────────
  // All hooks must run unconditionally. The skeleton conditional return is
  // placed AFTER all hooks to satisfy the rules of hooks.
  useEffect(() => {
    if (!studentId) return

    async function run() {
      try {
        const [hydrated, locksResult] = await Promise.all([
          hydrateLesson(studentId, lesson.id),
          supabase.from('slide_locks').select('slide_id, locked').eq('lesson_id', lesson.id),
        ])

        const locks: Record<string, boolean> = {}
        for (const row of locksResult.data ?? []) {
          locks[row.slide_id] = row.locked
        }

        const resumeIdx = resolveResumeSlide(
          lesson.slides,
          hydrated.committed,
          hydrated.currentSlideIndex,
          locks
        )

        dispatch({
          type: 'HYDRATE',
          payload: {
            answers: hydrated.answers,
            committed: hydrated.committed,
            locks,
            currentSlideIndex: resumeIdx,
          },
        })
      } catch {
        // Network failure — fall back to local Dexie state only.
        const fallback = await hydrateLessonFromDexie(lesson.id)
        dispatch({
          type: 'HYDRATE',
          payload: {
            answers: fallback.answers,
            committed: fallback.committed,
            locks: {},
            currentSlideIndex: 0,
          },
        })
        toast('Could not reach the server. Working from your local save.')
      }
    }

    void run()
    // Only run once per lesson mount — lesson.id is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, studentId])

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return

      if (e.key === '?') {
        e.preventDefault()
        dispatch({ type: state.ui.shortcutsOpen ? 'CLOSE_SHORTCUTS' : 'OPEN_SHORTCUTS' })
        return
      }

      // Arrow Right: advance to next slide when eligible
      if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (canGoNext) {
          e.preventDefault()
          dispatch({ type: 'NEXT' })
        }
        return
      }

      // Arrow Left: go back
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (canGoBack) {
          e.preventDefault()
          dispatch({ type: 'BACK' })
        }
        return
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, state.ui.shortcutsOpen, canGoNext, canGoBack])

  // ── Background sync ───────────────────────────────────────────────────────
  useBackgroundSync(studentId, lesson.id, true)

  // ── Lock subscription — keep locks in sync via Realtime ──────────────────
  useLockSubscription(lesson.id, dispatch, Boolean(studentId))

  // ── Progress tracking — fires after NEXT, BACK, GOTO, and HYDRATE ────────
  useEffect(() => {
    const slide = state.slides[state.currentSlideIndex]
    const isReview = slide?.type === 'review'
    const allSectionsCommitted = COMMITTED_SECTIONS.every((s) => Boolean(state.committed[s]))
    const status: 'not_started' | 'in_progress' | 'complete' =
      isReview && allSectionsCommitted ? 'complete' : 'in_progress'
    void updateProgress(studentId, lesson.id, state.currentSlideIndex, status)
  }, [lesson.id, state.currentSlideIndex, state.slides, state.committed, studentId])

  // ── beforeunload: best-effort sync ───────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      void syncDirtyDrafts(studentId, lesson.id)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [lesson.id, studentId])

  // ── Dev helper: window.__revealMcq(slideId) — toggles class reveal ───────
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as Window & { __revealMcq?: (slideId: string) => void }
    w.__revealMcq = (slideId: string) => dispatch({ type: 'TOGGLE_CLASS_REVEAL', slideId })
    return () => {
      delete w.__revealMcq
    }
  }, [dispatch])

  // ── Loading skeleton — shown while hydration is in flight ────────────────
  // Placed AFTER all hooks so the hook call count never changes between renders.
  if (!state.hydrated && studentId !== null) {
    return (
      <div
        data-testid="lesson-skeleton"
        aria-label="Loading lesson…"
        aria-busy="true"
        className="flex min-h-screen flex-col bg-ga-surface-muted"
      >
        <div className="h-[88px] animate-pulse border-b border-ga-border-subtle bg-ga-surface" />
        <div className="flex flex-1 p-8">
          <div className="mx-auto w-full max-w-[820px] space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded-ga-md bg-ga-surface" />
            <div className="h-4 w-full animate-pulse rounded-ga-md bg-ga-surface" />
            <div className="h-4 w-5/6 animate-pulse rounded-ga-md bg-ga-surface" />
            <div className="h-4 w-4/6 animate-pulse rounded-ga-md bg-ga-surface" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {state.ui.shortcutsOpen && <ShortcutHelpDialog />}
      <ToastRegion />
      {isDevMode && <DevToolbar />}
      <div className="flex min-h-screen flex-col bg-ga-surface-muted">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        {/* Two-row header, total ~88 px. Horizontal padding matches the main slide area. */}
        <header className="sticky top-0 z-10 border-b border-ga-border-subtle bg-ga-surface">
          {/* Row 1: lesson title (left) + save status (right) */}
          <div data-testid="header-row-1" className="flex h-11 items-center px-6 lg:px-8">
            <p className="min-w-0 flex-1 truncate font-sans text-lg font-semibold leading-snug text-ga-ink">
              {lesson.title}
            </p>
            <SaveStatusChip />
          </div>

          {/* Row 2: section name (left) + progress dots (right) */}
          <div data-testid="header-row-2" className="flex h-11 items-center px-6 lg:px-8">
            <p className="font-sans text-sm text-ga-ink-muted">
              {SECTION_LABELS[currentSlide.section] ?? currentSlide.section}
            </p>
            <div className="ml-auto">
              <ProgressDots
                currentSection={currentSlide.section as Section}
                committedSections={state.committed}
              />
            </div>
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main slide area */}
          <main id="main" className="flex flex-1 flex-col overflow-y-auto p-8 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[820px]">
              <SlideFrame key={currentSlide.id} slide={currentSlide} isLocked={isLocked}>
                {renderSlide(currentSlide)}
              </SlideFrame>
            </div>
          </main>

          {/* Action Plan Panel — 360 px at lg, 300 px at md, hidden below */}
          <div className="hidden md:block md:w-[300px] lg:w-[360px]">
            <div className="sticky top-[88px] h-[calc(100vh-88px-64px)] overflow-y-auto">
              <ActionPlanPanel scribeLabel={scribeLabel} />
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="sticky bottom-0 z-10 flex h-16 items-center border-t border-ga-border-subtle bg-ga-surface px-6">
          {/* Back */}
          <div className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => dispatch({ type: 'BACK' })}
              disabled={!canGoBack}
              aria-label="Previous slide"
              className={[
                'flex items-center gap-1.5 rounded-ga-sm px-4 py-2 font-sans text-sm font-medium transition-colors',
                canGoBack
                  ? 'border border-ga-border-strong text-ga-ink hover:border-ga-primary hover:text-ga-primary'
                  : 'cursor-not-allowed border border-ga-border-subtle text-ga-ink-muted opacity-40',
              ].join(' ')}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Back
            </button>
          </div>

          {/* Slide counter */}
          <div className="flex items-center justify-center">
            <span className="font-sans text-sm text-ga-ink-muted">
              {slideNumber} of {totalSlides}
            </span>
          </div>

          {/* Next */}
          <div className="flex flex-1 items-center justify-end">
            <button
              type="button"
              onClick={() => dispatch({ type: 'NEXT' })}
              disabled={!canGoNext}
              aria-label="Next slide"
              className={[
                'flex items-center gap-1.5 rounded-ga-sm px-4 py-2 font-sans text-sm font-medium transition-colors',
                canGoNext
                  ? 'bg-ga-primary text-white hover:bg-ga-primary-dark'
                  : 'cursor-not-allowed bg-ga-primary/40 text-white opacity-40',
              ].join(' ')}
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </>
  )
}

// ── LessonShell — wraps context ───────────────────────────────────────────────

interface LessonShellProps {
  lesson: LessonConfig
  /**
   * Authenticated student UUID. Null (default) when unauthenticated — skips
   * network hydration and shows content immediately from initial state.
   * Phase 3: will come from auth context once wired.
   */
  studentId?: string | null
}

export function LessonShell({ lesson, studentId = null }: LessonShellProps) {
  return <LessonShellInner lesson={lesson} studentId={studentId} />
}
