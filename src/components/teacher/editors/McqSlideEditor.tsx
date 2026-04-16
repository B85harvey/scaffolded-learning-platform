/**
 * McqSlideEditor — editor for 'mcq' type slides.
 *
 * Question textarea → 2-6 option rows (text + correct radio + delete) →
 * variant toggle (self-check / class-check) → optional wrong-answer explanation.
 */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface McqOption {
  id: string
  text: string
  correct?: boolean
  explanation?: string
}

export interface McqConfig {
  id: string
  type: 'mcq'
  section: string
  question: string
  options: McqOption[]
  variant: 'self' | 'class'
}

interface Props {
  config: McqConfig
  onConfigChange: (config: McqConfig) => void
}

const MIN_OPTIONS = 2
const MAX_OPTIONS = 6

function newOption(): McqOption {
  return {
    id: `opt-${Math.random().toString(36).slice(2, 9)}`,
    text: '',
    correct: false,
  }
}

export function McqSlideEditor({ config, onConfigChange }: Props) {
  const [showExplanation, setShowExplanation] = useState(
    config.options.some((o) => Boolean(o.explanation))
  )

  function update(partial: Partial<McqConfig>) {
    onConfigChange({ ...config, ...partial })
  }

  function handleOptionText(id: string, text: string) {
    update({ options: config.options.map((o) => (o.id === id ? { ...o, text } : o)) })
  }

  function handleCorrect(id: string) {
    // Only one option can be correct at a time
    update({ options: config.options.map((o) => ({ ...o, correct: o.id === id })) })
  }

  function handleExplanation(id: string, explanation: string) {
    update({ options: config.options.map((o) => (o.id === id ? { ...o, explanation } : o)) })
  }

  function handleAddOption() {
    if (config.options.length >= MAX_OPTIONS) return
    update({ options: [...config.options, newOption()] })
  }

  function handleDeleteOption(id: string) {
    if (config.options.length <= MIN_OPTIONS) return
    update({ options: config.options.filter((o) => o.id !== id) })
  }

  return (
    <div className="overflow-y-auto p-6">
      <div className="mx-auto max-w-[640px] space-y-8">
        {/* Question */}
        <div>
          <label htmlFor="mcq-question" className="mb-2 block text-sm font-medium text-ga-ink">
            Question
          </label>
          <textarea
            id="mcq-question"
            value={config.question}
            onChange={(e) => update({ question: e.target.value })}
            placeholder="Enter the question…"
            rows={3}
            className="w-full resize-none rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-3 py-2 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
          />
        </div>

        {/* Options */}
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ga-ink">
            Options{' '}
            <span className="font-normal text-ga-ink-muted">
              ({config.options.length} of {MAX_OPTIONS} max)
            </span>
          </legend>

          <div className="space-y-2" role="list">
            {config.options.map((option, idx) => (
              <div
                key={option.id}
                role="listitem"
                data-testid={`option-row-${idx}`}
                className="flex items-start gap-3 rounded-ga-sm border border-ga-border-subtle bg-ga-surface p-3"
              >
                {/* Correct radio */}
                <input
                  type="radio"
                  name="correct-option"
                  aria-label={`Mark option ${idx + 1} as correct`}
                  checked={Boolean(option.correct)}
                  onChange={() => handleCorrect(option.id)}
                  className="mt-2 accent-ga-primary"
                />

                {/* Text + optional explanation */}
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="text"
                    aria-label={`Option ${idx + 1} text`}
                    value={option.text}
                    onChange={(e) => handleOptionText(option.id, e.target.value)}
                    placeholder={`Option ${idx + 1}…`}
                    className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
                  />
                  {showExplanation && (
                    <textarea
                      aria-label={`Option ${idx + 1} wrong-answer explanation`}
                      value={option.explanation ?? ''}
                      onChange={(e) => handleExplanation(option.id, e.target.value)}
                      placeholder="Shown to students on wrong answer (leave blank if correct)…"
                      rows={2}
                      className="w-full resize-none rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2 py-1.5 font-sans text-xs text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
                    />
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  aria-label={`Delete option ${idx + 1}`}
                  disabled={config.options.length <= MIN_OPTIONS}
                  onClick={() => handleDeleteOption(option.id)}
                  className="mt-1.5 shrink-0 rounded-ga-sm p-1 text-ga-ink-muted hover:text-ga-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              disabled={config.options.length >= MAX_OPTIONS}
              onClick={handleAddOption}
              data-testid="add-option-btn"
              className="flex items-center gap-1.5 rounded-ga-sm border border-ga-border-subtle px-3 py-1.5 text-sm text-ga-ink-muted hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} aria-hidden="true" />
              Add option
            </button>

            {!showExplanation && (
              <button
                type="button"
                onClick={() => setShowExplanation(true)}
                className="text-sm text-ga-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
              >
                Add explanation
              </button>
            )}
          </div>
        </fieldset>

        {/* Variant toggle */}
        <div>
          <p className="mb-3 text-sm font-medium text-ga-ink">Check mode</p>
          <div className="flex gap-4">
            {(
              [
                {
                  value: 'self' as const,
                  label: 'Self-check',
                  desc: 'Each student answers individually on their device.',
                },
                {
                  value: 'class' as const,
                  label: 'Class-check',
                  desc: 'The class discusses and the scribe submits one answer.',
                },
              ] satisfies Array<{ value: 'self' | 'class'; label: string; desc: string }>
            ).map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex flex-1 cursor-pointer flex-col rounded-ga-sm border p-4 transition-colors ${
                  config.variant === value
                    ? 'border-ga-primary bg-ga-primary/5'
                    : 'border-ga-border-subtle bg-ga-surface hover:border-ga-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="mcq-variant"
                  value={value}
                  checked={config.variant === value}
                  onChange={() => update({ variant: value })}
                  className="sr-only"
                />
                <span className="font-sans text-sm font-medium text-ga-ink">{label}</span>
                <span className="mt-1 font-sans text-xs text-ga-ink-muted">{desc}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
