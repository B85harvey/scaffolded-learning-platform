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

type OptionVisual = 'default' | 'hover-eligible' | 'selected' | 'correct' | 'incorrect' | 'revealed'

// ── Option class map ──────────────────────────────────────────────────────────

const OPTION_CLASSES: Record<OptionVisual, string> = {
  default: 'border-ga-border-strong bg-white cursor-default opacity-60',
  'hover-eligible':
    'border-ga-border-strong bg-white cursor-pointer hover:border-ga-primary hover:bg-ga-surface-muted',
  selected: 'border-ga-primary bg-ga-primary/[.06] cursor-pointer',
  correct: 'border-ga-green bg-ga-green/[.08] cursor-default',
  incorrect: 'border-ga-red bg-ga-red/[.08] cursor-default',
  revealed: 'border-ga-green bg-ga-green/[.08] cursor-default',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SlideMcq({ slide }: SlideMcqProps) {
  const { state, dispatch } = useLesson()

  // Derive resolved state from the reducer
  const rawAnswers = state.answers[slide.id]
  const answerValues = rawAnswers?.kind === 'text' ? rawAnswers.values : {}
  const resolvedId = answerValues['selection'] ?? ''
  const wrongAttempts = parseInt(answerValues['wrongAttempts'] ?? '0', 10)

  const correctOption = slide.options.find((o) => o.correct)

  // isCorrect: student submitted the correct answer (not auto-revealed)
  const isCorrect = resolvedId !== '' && resolvedId === correctOption?.id && wrongAttempts < 2
  // isRevealed: correct answer shown after two wrong attempts
  const isRevealed = wrongAttempts >= 2 && !isCorrect
  const isResolved = isCorrect || isRevealed

  // Local UI state — resets on slide remount (key={slide.id} on SlideFrame)
  const [localSelection, setLocalSelection] = useState<string | undefined>(undefined)
  const [submittedWrongId, setSubmittedWrongId] = useState<string | undefined>(undefined)
  const [announcement, setAnnouncement] = useState('')

  // ── Event handlers ──────────────────────────────────────────────────────────

  const handleSelect = (optionId: string) => {
    if (isResolved) return
    setLocalSelection(optionId)
    setSubmittedWrongId(undefined)
  }

  const handleSubmit = (selId: string | undefined = localSelection) => {
    if (isResolved || !selId) return

    if (selId === correctOption?.id) {
      dispatch({ type: 'SET_TEXT_ANSWER', slideId: slide.id, promptId: 'selection', value: selId })
      setAnnouncement('Correct')
      setLocalSelection(undefined)
    } else {
      const newWrong = wrongAttempts + 1
      setSubmittedWrongId(selId)
      setLocalSelection(undefined)
      dispatch({
        type: 'SET_TEXT_ANSWER',
        slideId: slide.id,
        promptId: 'wrongAttempts',
        value: String(newWrong),
      })
      if (newWrong >= 2) {
        // Reveal the correct answer
        dispatch({
          type: 'SET_TEXT_ANSWER',
          slideId: slide.id,
          promptId: 'selection',
          value: correctOption?.id ?? '',
        })
        setAnnouncement('Correct answer revealed')
      } else {
        setAnnouncement('Not quite. Try again')
      }
    }
  }

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    // Digits 1-6: select and focus the corresponding option
    if (e.key >= '1' && e.key <= '6' && !isResolved) {
      const idx = parseInt(e.key, 10) - 1
      const option = slide.options[idx]
      if (option) {
        e.preventDefault()
        handleSelect(option.id)
        document.getElementById(`mcq-option-${slide.id}-${option.id}`)?.focus()
      }
    }
    // Cmd/Ctrl+Enter: submit from anywhere on the slide
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── Visual state per option ─────────────────────────────────────────────────

  const getOptionVisual = (option: McqOption): OptionVisual => {
    if (isResolved) {
      // Post-resolution
      if (option.id === correctOption?.id) return isCorrect ? 'correct' : 'revealed'
      if (option.id === submittedWrongId) return 'incorrect'
      return 'default'
    }

    // Pre-resolution: show feedback for the last wrong attempt
    if (submittedWrongId && option.id === submittedWrongId) return 'incorrect'
    return localSelection === option.id ? 'selected' : 'hover-eligible'
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section
      className="mx-auto w-full max-w-[820px]"
      onKeyDown={handleContainerKeyDown}
      aria-label="Multiple choice question"
    >
      {/* Question text */}
      <h2 className="mb-6 font-sans text-lg font-semibold leading-7 text-ga-ink">
        {slide.question}
      </h2>

      {/* Options list */}
      <div className="flex flex-col gap-3" role="list" aria-label="Answer options">
        {slide.options.map((option, idx) => {
          const visual = getOptionVisual(option)
          const showIcon = visual === 'correct' || visual === 'revealed' || visual === 'incorrect'
          const showExplanation =
            (visual === 'incorrect' || visual === 'correct' || visual === 'revealed') &&
            Boolean(option.explanation)

          return (
            <div key={option.id} role="listitem">
              <button
                id={`mcq-option-${slide.id}-${option.id}`}
                type="button"
                aria-pressed={visual === 'selected'}
                aria-label={`Option ${idx + 1}: ${option.text}`}
                className={cn(
                  'flex w-full items-start gap-4 rounded-ga-md border p-4 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
                  OPTION_CLASSES[visual]
                )}
                onClick={() => handleSelect(option.id)}
                onKeyDown={(e) => {
                  // Enter on a focused option: prevent the default click and submit directly
                  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault()
                    handleSubmit(option.id)
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
                    {(visual === 'correct' || visual === 'revealed') && (
                      <CheckCircle
                        size={20}
                        className="mt-0.5 shrink-0 text-ga-green"
                        aria-hidden="true"
                      />
                    )}
                    {visual === 'incorrect' && (
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

              {/* Explanation line — below the button */}
              {showExplanation && (
                <p
                  className={cn(
                    'mt-1.5 pl-4 font-sans text-sm',
                    visual === 'incorrect' ? 'text-ga-red' : 'text-ga-green'
                  )}
                >
                  {option.explanation}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Live region for screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </section>
  )
}
