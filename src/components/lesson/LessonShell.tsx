import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLesson } from '@/contexts/LessonContext'
import type { LessonState } from '@/contexts/lessonReducer'
import { ActionPlanPanel } from './ActionPlanPanel'
import { SlideFrame } from './SlideFrame'
import { SlideContent } from './slides/SlideContent'
import { SlideMcq } from './slides/SlideMcq'
import { SlideScaffold } from './slides/SlideScaffold'
import { SlidePlaceholder } from './slides/SlidePlaceholder'
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
      return <SlidePlaceholder type="review" />
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

// ── SaveStatus chip ───────────────────────────────────────────────────────────

function SaveStatus() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5"
      aria-label="Save status: saved to this device"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ga-amber-solid" aria-hidden="true" />
      <span className="font-sans text-sm text-ga-ink-muted">Saved locally</span>
    </div>
  )
}

// ── LessonShellInner — uses context ───────────────────────────────────────────

function LessonShellInner({ lesson }: { lesson: LessonConfig }) {
  const { state, dispatch } = useLesson()

  const currentSlide = state.slides[state.currentSlideIndex]
  const isLocked = Boolean(state.locks[currentSlide.id])
  const totalSlides = state.slides.length
  const slideNumber = state.currentSlideIndex + 1

  const canGoBack = state.currentSlideIndex > 0
  const canGoNext =
    state.currentSlideIndex < totalSlides - 1 && slideCanAdvance(currentSlide, state)

  return (
    <div className="flex min-h-screen flex-col bg-ga-surface-muted">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex h-16 items-center border-b border-ga-border-subtle bg-ga-surface px-6">
        {/* Left: title + section name */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-base font-semibold leading-5 text-ga-ink">
            {lesson.title}
          </p>
          <p className="font-sans text-xs text-ga-ink-muted">
            {SECTION_LABELS[currentSlide.section] ?? currentSlide.section}
          </p>
        </div>

        {/* Centre: progress dots */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <ProgressDots
            currentSection={currentSlide.section as Section}
            committedSections={state.committed}
          />
        </div>

        {/* Right: save status */}
        <div className="flex flex-1 justify-end">
          <SaveStatus />
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
          <div className="sticky top-16 h-[calc(100vh-64px-64px)] overflow-y-auto">
            <ActionPlanPanel scribe={lesson.scribe} />
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
  )
}

// ── LessonShell — wraps context ───────────────────────────────────────────────

interface LessonShellProps {
  lesson: LessonConfig
}

export function LessonShell({ lesson }: LessonShellProps) {
  return <LessonShellInner lesson={lesson} />
}
