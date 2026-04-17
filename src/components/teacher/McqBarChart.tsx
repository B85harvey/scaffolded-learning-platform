/**
 * McqBarChart — vertical bar chart for MCQ class-check results.
 *
 * Renders one bar per option using plain divs with inline height.
 * Bar heights are proportional to each other (relative to the max count).
 * Percentage labels above each bar reflect the share of total responses.
 *
 * Props:
 *   options      — option text labels
 *   counts       — response count for each option (parallel to options)
 *   correctIndex — index of the correct option
 *   total        — total number of responses (sum of counts)
 *
 * Shows an empty state when total === 0.
 */
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  options: string[]
  counts: number[]
  correctIndex: number
  total: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function McqBarChart({ options, counts, correctIndex, total }: Props) {
  // Empty state
  if (total === 0) {
    return (
      <p data-testid="mcq-chart-empty" className="font-sans text-sm italic text-ga-ink-muted">
        No responses yet.
      </p>
    )
  }

  const maxCount = Math.max(...counts, 1)

  // Accessible summary for screen readers
  const ariaLabel =
    'MCQ results: ' +
    options
      .map((opt, i) => {
        const count = counts[i] ?? 0
        const pct = Math.round((count / total) * 100)
        return `${opt} ${count} vote${count !== 1 ? 's' : ''} ${pct}%`
      })
      .join(', ')

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-testid="mcq-bar-chart"
      className="flex items-end gap-4"
    >
      {options.map((option, i) => {
        const count = counts[i] ?? 0
        const pct = Math.round((count / total) * 100)
        // Height relative to the tallest bar so all bars are visible
        const heightPct = Math.round((count / maxCount) * 100)
        const isCorrect = i === correctIndex

        return (
          <div
            key={i}
            data-testid={`mcq-option-col-${i}`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/* Count + percentage label above bar */}
            <span
              data-testid={`mcq-label-${i}`}
              className="font-sans text-xs font-medium text-ga-ink"
            >
              {count} ({pct}%)
            </span>

            {/* Fixed-height container; bar grows from the bottom */}
            <div className="flex h-48 w-full items-end">
              <div
                data-testid={`mcq-bar-${i}`}
                className={cn(
                  'w-full rounded-t-ga-sm transition-all duration-300',
                  isCorrect ? 'bg-ga-green' : 'bg-ga-primary/40'
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>

            {/* Option text label below bar */}
            <span
              data-testid={`mcq-option-text-${i}`}
              className="text-center font-sans text-xs text-ga-ink-muted"
            >
              {option}
            </span>
          </div>
        )
      })}
    </div>
  )
}
