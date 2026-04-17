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
 *   theme        — 'dark' | 'light' — controls text and bar colours
 *
 * Shows an empty state when total === 0.
 * Legible on both dark (Live Wall) and light (Dashboard) backgrounds.
 */
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  options: string[]
  counts: number[]
  correctIndex: number
  total: number
  theme?: 'dark' | 'light'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function McqBarChart({ options, counts, correctIndex, total, theme = 'light' }: Props) {
  const isDark = theme === 'dark'

  // Empty state
  if (total === 0) {
    return (
      <p
        data-testid="mcq-chart-empty"
        className={cn('font-sans text-sm italic', isDark ? 'text-white/60' : 'text-ga-ink-muted')}
      >
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
        // Height relative to the tallest bar so all bars are always visible
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
              className={cn('font-sans text-xs font-medium', isDark ? 'text-white' : 'text-ga-ink')}
            >
              {count} ({pct}%)
            </span>

            {/* Fixed-height container; bar grows from the bottom */}
            <div className="flex h-48 w-full items-end">
              <div
                data-testid={`mcq-bar-${i}`}
                className={cn(
                  'w-full rounded-t-ga-sm transition-all duration-300',
                  isCorrect
                    ? 'bg-ga-green'
                    : // Dark theme: higher opacity (primary-100 equivalent) for legibility
                      // Light theme: softer tint (primary-200 equivalent)
                      isDark
                      ? 'bg-ga-primary/60'
                      : 'bg-ga-primary/40'
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>

            {/* Option text label below bar */}
            <span
              data-testid={`mcq-option-text-${i}`}
              className={cn(
                'text-center font-sans text-xs',
                isDark ? 'text-white/70' : 'text-ga-ink-muted'
              )}
            >
              {option}
            </span>
          </div>
        )
      })}
    </div>
  )
}
