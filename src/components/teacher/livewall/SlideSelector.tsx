/**
 * SlideSelector — horizontal pill-button bar for the Live Wall.
 *
 * Shows one button per scaffold slide (labelled with the section display name)
 * and one button per class-check MCQ slide (first 30 chars of the question).
 * Scrollable when there are many buttons.
 */
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WallSlide {
  slideId: string
  type: 'scaffold' | 'mcq'
  /** Display label: section name for scaffold, truncated question for MCQ. */
  label: string
  /** Scaffold section key used to filter lesson_submissions. */
  section?: string
}

interface Props {
  slides: WallSlide[]
  selectedSlideId: string | null
  onSelect: (slide: WallSlide) => void
  theme: 'dark' | 'light'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SlideSelector({ slides, selectedSlideId, onSelect, theme }: Props) {
  const isDark = theme === 'dark'

  return (
    <nav
      aria-label="Slide selector"
      data-testid="slide-selector"
      className={cn(
        'overflow-x-auto border-b px-4 py-3',
        isDark ? 'border-white/10' : 'border-ga-border-subtle'
      )}
    >
      <ul className="flex gap-2" role="list">
        {slides.map((slide) => {
          const isActive = slide.slideId === selectedSlideId
          return (
            <li key={slide.slideId} role="listitem">
              <button
                type="button"
                onClick={() => onSelect(slide)}
                aria-pressed={isActive}
                data-testid={`slide-btn-${slide.slideId}`}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70',
                  isActive
                    ? 'bg-ga-primary text-white'
                    : isDark
                      ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                      : 'bg-ga-surface-muted text-ga-ink-muted hover:bg-ga-border-subtle hover:text-ga-ink'
                )}
              >
                {slide.label}
              </button>
            </li>
          )
        })}
        {slides.length === 0 && (
          <li>
            <span
              className={cn('font-sans text-sm', isDark ? 'text-white/40' : 'text-ga-ink-muted')}
            >
              No scaffold or class-check slides in this lesson.
            </span>
          </li>
        )}
      </ul>
    </nav>
  )
}
