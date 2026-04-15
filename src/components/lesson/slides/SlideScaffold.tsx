import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLesson } from '@/contexts/LessonContext'
import { assembleSlide } from '@/lessons/engineAdapter'
import type { Warning } from '@/lib/scaffold'
import type { SlideConfig } from '@/lessons/types'
import { FramedMode } from './scaffold/FramedMode'

type ScaffoldSlide = Extract<SlideConfig, { type: 'scaffold' }>

const SECTION_LABELS: Record<string, string> = {
  aim: 'Aim',
  issues: 'Issues',
  decision: 'Decision',
  justification: 'Justification',
  implementation: 'Implementation',
  references: 'References',
}

interface SlideScaffoldProps {
  slide: ScaffoldSlide
}

// ── Placeholder for modes not yet built ───────────────────────────────────────

function ModePlaceholder({ mode }: { mode: 'guided' | 'freeform-table' }) {
  const label = mode === 'guided' ? 'Guided' : 'Freeform table'
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-ga-md border border-dashed border-ga-border-subtle bg-ga-surface-muted p-10 text-center">
      <p className="text-base font-medium text-ga-ink">{label} mode coming in the next slice.</p>
    </div>
  )
}

// ── SlideScaffold ─────────────────────────────────────────────────────────────

export function SlideScaffold({ slide }: SlideScaffoldProps) {
  const { state, dispatch } = useLesson()

  const isCommitted = state.committedSlideIds.includes(slide.id)

  // Engine warnings are stored locally — they reset when the slide remounts
  // (key={slide.id} on SlideFrame), which is the correct lifecycle.
  const [warnings, setWarnings] = useState<Warning[]>([])

  // ── Commit gate ─────────────────────────────────────────────────────────────

  const prompts = slide.config.prompts ?? []
  const slideAnswers = state.answers[slide.id]
  const textValues = slideAnswers?.kind === 'text' ? slideAnswers.values : {}

  const emptyPrompts = prompts.filter((p) => !textValues[p.id]?.trim())
  const canCommit = !isCommitted && emptyPrompts.length === 0

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCommit = () => {
    if (!canCommit) return
    // Call the engine locally to get warnings for display, then commit via reducer
    const result = assembleSlide(slide, slideAnswers)
    setWarnings(result.warnings)
    dispatch({ type: 'COMMIT', slideId: slide.id })
  }

  const handleEdit = () => {
    setWarnings([])
    dispatch({ type: 'UNCOMMIT', slideId: slide.id })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canCommit) {
      e.preventDefault()
      handleCommit()
    }
  }

  // ── Tooltip for disabled commit button ──────────────────────────────────────

  const missingLabels = emptyPrompts
    .slice(0, 3)
    .map((p) => p.text.split(' ').slice(0, 4).join(' ') + (p.text.split(' ').length > 4 ? '…' : ''))
    .join(', ')
  const commitTooltip = !canCommit && !isCommitted ? `Fill in: ${missingLabels}` : undefined

  // ── Section label ───────────────────────────────────────────────────────────

  const sectionLabel = SECTION_LABELS[slide.section] ?? slide.config.sectionHeading ?? slide.section

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <article className="mx-auto w-full max-w-[820px]" onKeyDown={handleKeyDown}>
      {/* Section badge */}
      <p
        className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.04em] text-ga-primary"
        aria-label={`Section: ${sectionLabel}`}
      >
        {sectionLabel}
      </p>

      {/* Slide heading */}
      <h2 className="mb-6 font-sans text-2xl font-semibold leading-8 text-ga-ink">
        {slide.config.targetQuestion}
      </h2>

      {/* Mode renderer */}
      {slide.mode === 'framed' ? (
        <FramedMode slide={slide} warnings={warnings} isCommitted={isCommitted} />
      ) : slide.mode === 'guided' ? (
        <ModePlaceholder mode="guided" />
      ) : (
        <ModePlaceholder mode="freeform-table" />
      )}

      {/* Commit / Edit button — bottom right */}
      <div className="mt-8 flex justify-end">
        {isCommitted ? (
          <button
            type="button"
            onClick={handleEdit}
            className={cn(
              'rounded-ga-sm border border-ga-border-strong px-5 py-2 font-sans text-sm font-medium text-ga-ink',
              'transition-colors hover:border-ga-primary hover:text-ga-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2'
            )}
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCommit}
            disabled={!canCommit}
            title={commitTooltip}
            className={cn(
              'rounded-ga-sm px-5 py-2 font-sans text-sm font-medium text-white',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
              canCommit
                ? 'bg-ga-primary hover:bg-ga-primary-dark'
                : 'cursor-not-allowed bg-ga-primary/40'
            )}
          >
            Commit
          </button>
        )}
      </div>
    </article>
  )
}
