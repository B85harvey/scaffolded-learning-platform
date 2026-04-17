/**
 * SlidePreview — read-only preview of any slide type as students would see it.
 *
 * Content: renders SlideContent directly (no context needed).
 * MCQ: renders a simplified read-only view (question + options).
 * Scaffold: renders the prompts / table structure with dummy placeholder text.
 */
import { SlideContent } from '@/components/lesson/slides/SlideContent'
import type { ContentConfig } from './editors/ContentSlideEditor'
import type { McqConfig } from './editors/McqSlideEditor'
import type { ScaffoldSlideConfig } from './editors/ScaffoldSlideEditor'
import type { Prompt } from '@/lib/scaffold/types'

interface Props {
  slideType: 'content' | 'mcq' | 'scaffold' | 'review'
  config: Record<string, unknown>
}

// ── MCQ preview ───────────────────────────────────────────────────────────────

function McqPreview({ config }: { config: McqConfig }) {
  return (
    <div className="mx-auto w-full max-w-[820px]">
      <p className="mb-6 font-sans text-xl font-semibold text-ga-ink">{config.question}</p>
      <ul className="flex flex-col gap-3">
        {config.options.map((opt) => (
          <li
            key={opt.id}
            className="rounded-ga-sm border border-ga-border-strong bg-white px-4 py-3 font-sans text-sm text-ga-ink opacity-70"
          >
            {opt.text || <span className="italic text-ga-ink-muted">Empty option</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Scaffold preview ──────────────────────────────────────────────────────────

function ScaffoldPreview({ config }: { config: ScaffoldSlideConfig }) {
  const { mode } = config
  const inner = config.config

  if (mode === 'freeform-table') {
    const template = inner.template
    if (!template || template.columns.length === 0) {
      return <p className="font-sans text-sm italic text-ga-ink-muted">No table configured yet.</p>
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-sans text-sm">
          <thead>
            <tr>
              {template.columns.map((col, i) => (
                <th
                  key={col.id}
                  className="border border-ga-border-subtle bg-ga-surface-muted px-3 py-2 text-left font-semibold text-ga-ink"
                >
                  {col.label || `Column ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: template.minRows ?? 3 }, (_, rowIdx) => (
              <tr key={rowIdx}>
                {template.columns.map((col, colIdx) => (
                  <td
                    key={col.id}
                    className="border border-ga-border-subtle px-3 py-2 italic text-ga-ink-muted"
                  >
                    {colIdx === 0 && template.rowLabels?.[rowIdx]
                      ? template.rowLabels[rowIdx]
                      : `[Student answer ${rowIdx + 1}]`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Framed or guided — both use prompts
  const prompts: Prompt[] = inner.prompts ?? []
  if (prompts.length === 0) {
    return <p className="font-sans text-sm italic text-ga-ink-muted">No prompts configured yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {inner.targetQuestion && (
        <p className="font-sans text-base font-semibold text-ga-ink">{inner.targetQuestion}</p>
      )}
      {prompts.map((prompt, idx) => (
        <div key={prompt.id} data-testid={`preview-prompt-${idx}`} className="flex flex-col gap-1">
          {prompt.text && (
            <p className="font-sans text-xs font-medium text-ga-ink-muted">{prompt.text}</p>
          )}
          {mode === 'framed' && prompt.frame ? (
            <p className="font-sans text-sm text-ga-ink">
              {prompt.frame.split('{answer}').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="mx-0.5 inline-block rounded bg-ga-border-subtle px-2 py-0.5 font-sans text-sm italic text-ga-ink-muted">
                      [Student answer {idx + 1}]
                    </span>
                  )}
                </span>
              ))}
            </p>
          ) : (
            <div className="rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-3 py-2 font-sans text-sm italic text-ga-ink-muted">
              {prompt.hint || `[Student answer ${idx + 1}]`}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── SlidePreview ──────────────────────────────────────────────────────────────

export function SlidePreview({ slideType, config }: Props) {
  return (
    <div data-testid="slide-preview" className="h-full overflow-y-auto p-8">
      {slideType === 'content' && (
        <SlideContent
          title={(config as unknown as ContentConfig).title}
          body={(config as unknown as ContentConfig).body ?? ''}
          image={(config as unknown as ContentConfig).image}
        />
      )}
      {slideType === 'mcq' && <McqPreview config={config as unknown as McqConfig} />}
      {slideType === 'scaffold' && (
        <ScaffoldPreview config={config as unknown as ScaffoldSlideConfig} />
      )}
      {slideType === 'review' && (
        <p className="font-sans text-sm italic text-ga-ink-muted">
          Review slides are auto-generated from committed scaffold slides.
        </p>
      )}
    </div>
  )
}
