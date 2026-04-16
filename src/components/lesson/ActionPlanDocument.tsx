/* eslint-disable react-refresh/only-export-components -- shared constants and helpers exported alongside component */
import { cn } from '@/lib/utils'

// ── Section config ────────────────────────────────────────────────────────────

export const SECTIONS: { key: string; label: string }[] = [
  { key: 'aim', label: 'Aim' },
  { key: 'issues', label: 'Issues' },
  { key: 'decision', label: 'Decision' },
  { key: 'justification', label: 'Justification' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'references', label: 'References' },
]

// ── Markdown builder ──────────────────────────────────────────────────────────

/**
 * Builds a Markdown string from the committed sections.
 * Sections without text are rendered as *(Not yet written)*.
 */
export function buildMarkdown(committed: Record<string, string | undefined>): string {
  return SECTIONS.map(({ key, label }) => {
    const text = committed[key]
    return text ? `## ${label}\n\n${text}` : `## ${label}\n\n*(Not yet written)*`
  }).join('\n\n')
}

// ── Section block ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
  label: string
  text: string | undefined
  polished?: boolean
  emptyText?: string
}

function SectionBlock({
  label,
  text,
  polished = false,
  emptyText = 'Not yet written',
}: SectionBlockProps) {
  return (
    <div>
      <h2
        className={cn(
          'font-sans font-semibold text-ga-ink',
          polished ? 'mb-4 text-xl leading-8' : 'mb-2 text-base leading-7'
        )}
      >
        {label}
      </h2>

      {text ? (
        polished ? (
          <p className="indent-8 font-sans text-base leading-8 tracking-wide text-ga-ink">{text}</p>
        ) : (
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ga-ink">
            {text}
          </p>
        )
      ) : (
        <p className={cn('font-sans italic text-ga-ink-muted', polished ? 'text-base' : 'text-sm')}>
          {emptyText}
        </p>
      )}
    </div>
  )
}

// ── ActionPlanDocument ────────────────────────────────────────────────────────

interface ActionPlanDocumentProps {
  /** Map of section key → committed text (undefined = not committed). */
  committed: Record<string, string | undefined>
  polished?: boolean
  /** Text shown for uncommitted sections. Defaults to "Not yet written". */
  emptyText?: string
}

export function ActionPlanDocument({
  committed,
  polished = false,
  emptyText,
}: ActionPlanDocumentProps) {
  return (
    <div className={polished ? 'flex flex-col gap-10' : 'flex flex-col gap-8'}>
      {SECTIONS.map(({ key, label }) => (
        <SectionBlock
          key={key}
          label={label}
          text={committed[key]}
          polished={polished}
          emptyText={emptyText}
        />
      ))}
    </div>
  )
}
