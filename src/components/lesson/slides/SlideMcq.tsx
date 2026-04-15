import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLesson } from '@/contexts/LessonContext'
import type { McqOption, SlideConfig } from '@/lessons/types'

type McqSlide = Extract<SlideConfig, { type: 'mcq' }>

interface SlideMcqProps {
  slide: McqSlide
}

// ── Visual state type ─────────────────────────────────────────────────────────

type OptionVisual = 'default' | 'hover-eligible' | 'selected' | 'correct' | 'incorrect'

const OPTION_CLASSES: Record<OptionVisual, string> = {
  default: 'border-ga-border-strong bg-white cursor-default opacity-60',
  'hover-eligible':
    'border-ga-border-strong bg-white cursor-pointer hover:border-ga-primary hover:bg-ga-surface-muted',
  selected: 'border-ga-primary bg-ga-primary/[.06] cursor-pointer',
  correct: 'border-ga-green bg-ga-green/[.08] cursor-default',
  incorrect: 'border-ga-red bg-ga-red/[.08] cursor-default',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SlideMcq({ slide }: SlideMcqProps) {
  const { state, dispatch } = useLesson()

  // Reducer holds only the resolved-correct result. Wrong submissions stay local.
  const rawAnswers = state.answers[slide.id]
  const answerValues = rawAnswers?.kind === 'text' ? rawAnswers.values : {}
  const mcqResult = answerValues['mcqResult'] ?? 'pending'
  const isResolved = mcqResult === 'correct'

  const correctOption = slide.options.find((o) => o.correct)

  // Local UI state — resets on slide remount (key={slide.id} on SlideFrame)
  const [localSelection, setLocalSelection] = useState<string | undefined>(undefined)
  const [submittedWrongId, setSubmittedWrongId] = useState<string | undefined>(undefined)
  const [wrongExplanation, setWrongExplanation] = useState<string | undefined>(undefined)
  const [announcement, setAnnouncement] = useState('')

  // ── Derived ─────────────────────────────────────────────────────────────────

  const showTryAgain = !isResolved && submittedWrongId !== undefined
  // Submit button is visible when not resolved and not in Try-Again state.
  // It is disabled until the student makes a selection.
  const submitEnabled = !isResolved && localSelection !== undefined && !showTryAgain

  // ── Core submit logic ───────────────────────────────────────────────────────

  /**
   * Submit a selection. Can be called with an explicit option id (e.g. when
   * Enter is pressed on a focused option button) or will fall back to the
   * current `localSelection`.
   */
  const submit = (selId: string | undefined = localSelection) => {
    if (isResolved || !selId) return

    // Clear transient state before applying result
    setLocalSelection(undefined)
    setSubmittedWrongId(undefined)
    setWrongExplanation(undefined)

    if (selId === correctOption?.id) {
      dispatch({
        type: 'SET_TEXT_ANSWER',
        slideId: slide.id,
        promptId: 'mcqResult',
        value: 'correct',
      })
      setAnnouncement('Correct')
    } else {
      const option = slide.options.find((o) => o.id === selId)
      setSubmittedWrongId(selId)
      setWrongExplanation(option?.explanation)
      setAnnouncement('Not quite. Try again')
    }
  }

  // ── Selection handler ───────────────────────────────────────────────────────

  const handleSelect = (optionId: string) => {
    if (isResolved) return
    setLocalSelection(optionId)
    setSubmittedWrongId(undefined)
    setWrongExplanation(undefined)
    setAnnouncement('')
  }

  // ── Container keyboard handler ──────────────────────────────────────────────

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    // Digits 1–6: select and focus the corresponding option
    if (e.key >= '1' && e.key <= '6' && !isResolved) {
      const idx = parseInt(e.key, 10) - 1
      const option = slide.options[idx]
      if (option) {
        e.preventDefault()
        handleSelect(option.id)
        document.getElementById(`mcq-option-${slide.id}-${option.id}`)?.focus()
      }
    }

    // Cmd/Ctrl+Enter: submit when a selection is ready
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  // ── Option visual state ─────────────────────────────────────────────────────

  const getOptionVisual = (option: McqOption): OptionVisual => {
    if (isResolved) {
      return option.id === correctOption?.id ? 'correct' : 'default'
    }
    if (submittedWrongId === option.id) return 'incorrect'
    if (!submittedWrongId && localSelection === option.id) return 'selected'
    return 'hover-eligible'
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section
      className="mx-auto w-full max-w-[820px]"
      onKeyDown={handleContainerKeyDown}
      aria-label="Multiple choice question"
    >
      {/* Question */}
      <h2 className="mb-6 font-sans text-lg font-semibold leading-7 text-ga-ink">
        {slide.question}
      </h2>

      {/* Options */}
      <div className="flex flex-col gap-3" role="list" aria-label="Answer options">
        {slide.options.map((option, idx) => {
          const visual = getOptionVisual(option)
          const isWrong = visual === 'incorrect'
          const isCorrect = visual === 'correct'
          const showIcon = isWrong || isCorrect

          return (
            <div key={option.id} role="listitem">
              <button
                id={`mcq-option-${slide.id}-${option.id}`}
                type="button"
                aria-pressed={visual === 'selected'}
                aria-invalid={isWrong ? true : undefined}
                aria-label={`Option ${idx + 1}: ${option.text}`}
                className={cn(
                  'flex w-full items-start gap-4 rounded-ga-md border p-4 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
                  OPTION_CLASSES[visual]
                )}
                onClick={() => handleSelect(option.id)}
                onKeyDown={(e) => {
                  // Enter on a focused option: select it then submit immediately
                  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !isResolved) {
                    e.preventDefault()
                    submit(option.id)
                  }
                }}
              >
                {/* Numbered badge */}
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ga-sm bg-ga-surface-muted font-sans text-sm text-ga-ink-muted"
                >
                  {idx + 1}
                </span>

                {/* Post-submit icon */}
                {showIcon && (
                  <>
                    {isCorrect && (
                      <CheckCircle
                        size={20}
                        className="mt-0.5 shrink-0 text-ga-green"
                        aria-hidden="true"
                      />
                    )}
                    {isWrong && (
                      <XCircle
                        size={20}
                        className="mt-0.5 shrink-0 text-ga-red"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}

                {/* Option text */}
                <span className="font-sans text-base text-ga-ink">{option.text}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Wrong-answer explanation — below the options; never names the correct option */}
      {wrongExplanation && !isResolved && (
        <p className="mt-4 font-sans text-sm text-ga-red" role="alert">
          {wrongExplanation}
        </p>
      )}

      {/* Submit / Try-again area — bottom right, same position as Commit on scaffold slides */}
      <div className="mt-8 flex items-center justify-end">
        {isResolved ? null : showTryAgain ? (
          <p className="font-sans text-sm text-ga-ink-muted">
            Select another option and try again.
          </p>
        ) : (
          <button
            type="button"
            aria-label="Submit answer"
            disabled={!submitEnabled}
            onClick={() => submit()}
            className={cn(
              'rounded-ga-sm px-5 py-2 font-sans text-sm font-medium text-white',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
              submitEnabled
                ? 'bg-ga-primary hover:bg-ga-primary-dark'
                : 'cursor-not-allowed bg-ga-primary/40'
            )}
          >
            Submit
          </button>
        )}
      </div>

      {/* Live region — announces correct/incorrect feedback to screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </section>
  )
}
