import { useLayoutEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLesson } from '@/contexts/LessonContext'
import type { Warning } from '@/lib/scaffold'
import type { SlideConfig } from '@/lessons/types'
import { PromptAutosave } from '@/hooks/useAutosave'
import { countWords } from './wordCounter'

type ScaffoldSlide = Extract<SlideConfig, { type: 'scaffold' }>

interface GuidedModeProps {
  slide: ScaffoldSlide
  warnings: Warning[]
  isCommitted: boolean
}

interface CounterProps {
  value: string
  maxWords?: number
  maxLen?: number
}

function Counter({ value, maxWords, maxLen }: CounterProps) {
  if (maxWords !== undefined) {
    const wc = countWords(value)
    const isOver = wc >= maxWords
    return (
      <span
        className={cn(
          'shrink-0 font-sans text-sm',
          isOver ? 'text-ga-amber-solid' : 'text-ga-ink-muted'
        )}
        aria-live={isOver ? 'polite' : 'off'}
      >
        {wc} / {maxWords} words
      </span>
    )
  }
  if (maxLen !== undefined) {
    const cc = value.length
    const isOver = cc >= maxLen
    return (
      <span
        className={cn(
          'shrink-0 font-sans text-sm',
          isOver ? 'text-ga-amber-solid' : 'text-ga-ink-muted'
        )}
        aria-live={isOver ? 'polite' : 'off'}
      >
        {cc} / {maxLen} chars
      </span>
    )
  }
  return null
}

// ── Auto-growing textarea ─────────────────────────────────────────────────────

interface PromptInputProps {
  id: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
}

function PromptInput({ id, value, readOnly, onChange }: PromptInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight || 80, 80), 240)}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      readOnly={readOnly}
      style={{ minHeight: '80px', maxHeight: '240px', overflowY: 'auto', height: '80px' }}
      className={cn(
        'w-full resize-none rounded-ga-sm border px-4 py-2.5 font-sans text-base text-ga-ink',
        'focus-visible:border-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40',
        readOnly
          ? 'border-ga-border-subtle bg-ga-surface-muted text-ga-ink-muted'
          : 'border-ga-border-strong bg-white'
      )}
      onChange={(e) => {
        if (readOnly) return
        const ta = e.target
        ta.style.height = 'auto'
        ta.style.height = `${Math.min(Math.max(ta.scrollHeight || 80, 80), 240)}px`
        onChange(e.target.value)
      }}
    />
  )
}

// ── GuidedMode ────────────────────────────────────────────────────────────────

export function GuidedMode({ slide, warnings, isCommitted }: GuidedModeProps) {
  const { state, dispatch } = useLesson()

  const slideAnswers = state.answers[slide.id]
  const textValues = slideAnswers?.kind === 'text' ? slideAnswers.values : {}

  const prompts = slide.config.prompts ?? []

  return (
    <div className="flex flex-col gap-6">
      {prompts.map((prompt) => {
        const value = textValues[prompt.id] ?? ''
        const promptWarnings = warnings.filter((w) => w.promptId === prompt.id)

        return (
          <div key={prompt.id}>
            <PromptAutosave
              lessonId={state.lessonId}
              slideId={slide.id}
              promptId={prompt.id}
              value={value}
            />
            {/* Label row: prompt question + word/char counter */}
            <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
              <label
                htmlFor={`guided-input-${slide.id}-${prompt.id}`}
                className="font-sans text-lg font-semibold leading-7 text-ga-ink"
              >
                {prompt.text}
              </label>
              <Counter value={value} maxWords={prompt.maxWords} maxLen={prompt.maxLen} />
            </div>

            {/* Input */}
            <PromptInput
              id={`guided-input-${slide.id}-${prompt.id}`}
              value={value}
              readOnly={isCommitted}
              onChange={(val) =>
                dispatch({
                  type: 'SET_TEXT_ANSWER',
                  slideId: slide.id,
                  promptId: prompt.id,
                  value: val,
                })
              }
            />

            {/* Helper text */}
            {prompt.hint && (
              <p className="mt-1.5 font-sans text-sm text-ga-ink-muted">{prompt.hint}</p>
            )}

            {/* Engine warning chips — shown after commit */}
            {promptWarnings.map((w, i) => (
              <div key={i} className="mt-1.5 flex items-center gap-1.5" aria-live="polite">
                <AlertTriangle
                  size={14}
                  className="shrink-0 text-ga-amber-solid"
                  aria-hidden="true"
                />
                <p className="font-sans text-sm text-ga-amber-solid">{w.message}</p>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
