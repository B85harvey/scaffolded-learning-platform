import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLesson } from '@/contexts/LessonContext'
import { toast } from '@/components/ui/Toast'

/**
 * Developer toolbar — only mounted when window.location.search includes 'dev=1'.
 *
 * Floating chip (bottom-right) that expands into a panel on click. Provides:
 * - Slide jumper (select by id/title)
 * - Toggle lock on current slide
 * - Reveal MCQ (enabled only on class-check MCQ slides)
 * - Reset all answers (clears answers, committed, locks, classReveal → slide 1)
 * - Export state as JSON (copies to clipboard, fires info toast)
 *
 * Keyboard: Escape collapses the panel; all controls are Tab reachable.
 * Never snapshot this component — it is gated out in tests via the ?dev=1 check.
 */
export function DevToolbar() {
  const { state, dispatch } = useLesson()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLButtonElement>(null)

  const currentSlide = state.slides[state.currentSlideIndex]

  const isMcqClassCheck = currentSlide.type === 'mcq' && currentSlide.variant === 'class'

  // ── Keyboard: Escape collapses ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        chipRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [open])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleJump = (slideId: string) => {
    dispatch({ type: 'GOTO', slideId })
  }

  const handleToggleLock = () => {
    dispatch({ type: 'TOGGLE_LOCK', slideId: currentSlide.id })
  }

  const handleRevealMcq = () => {
    if (!isMcqClassCheck) return
    dispatch({ type: 'TOGGLE_CLASS_REVEAL', slideId: currentSlide.id })
  }

  const handleResetAll = () => {
    dispatch({ type: 'RESET_ALL' })
    setOpen(false)
  }

  const handleExport = async () => {
    const json = JSON.stringify(state, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      toast('State JSON copied to clipboard', { variant: 'info' })
    } catch {
      toast('Copy failed', { variant: 'default' })
    }
  }

  // ── Shared button classes ──────────────────────────────────────────────────
  const btnBase = cn(
    'rounded-ga-sm px-3 py-1.5 font-sans text-xs font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-1'
  )

  return (
    <div
      data-testid="dev-toolbar"
      className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2"
    >
      {/* Expanded panel */}
      {open && (
        <div
          ref={panelRef}
          role="region"
          aria-label="Developer toolbar"
          className="pointer-events-auto flex w-72 flex-col gap-3 rounded-ga-md border border-ga-border-strong bg-ga-surface p-4 shadow-ga-lg"
        >
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ga-ink-muted">
            Dev Toolbar
          </p>

          {/* Slide jumper */}
          <div>
            <label
              htmlFor="dev-slide-jumper"
              className="mb-1 block font-sans text-xs font-medium text-ga-ink-muted"
            >
              Jump to slide
            </label>
            <select
              id="dev-slide-jumper"
              value={currentSlide.id}
              onChange={(e) => handleJump(e.target.value)}
              className={cn(
                'w-full rounded-ga-sm border border-ga-border-strong bg-white px-2 py-1.5 font-sans text-xs text-ga-ink',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40'
              )}
            >
              {state.slides.map((slide, idx) => {
                const label =
                  slide.type === 'content' && slide.title
                    ? slide.title
                    : slide.type === 'scaffold'
                      ? `${slide.section} scaffold`
                      : slide.type === 'mcq'
                        ? `MCQ: ${slide.question.slice(0, 40)}…`
                        : slide.type === 'review'
                          ? 'Review'
                          : slide.id
                return (
                  <option key={slide.id} value={slide.id}>
                    {idx + 1}. {label}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleLock}
              className={cn(
                btnBase,
                'border border-ga-border-strong text-ga-ink hover:border-ga-primary hover:text-ga-primary'
              )}
            >
              {state.locks[currentSlide.id] ? 'Unlock slide' : 'Lock slide'}
            </button>

            <button
              type="button"
              onClick={handleRevealMcq}
              disabled={!isMcqClassCheck}
              aria-label="Reveal MCQ answers"
              className={cn(
                btnBase,
                isMcqClassCheck
                  ? 'border border-ga-border-strong text-ga-ink hover:border-ga-primary hover:text-ga-primary'
                  : 'cursor-not-allowed border border-ga-border-subtle text-ga-ink-muted opacity-40'
              )}
            >
              {state.classReveal[currentSlide.id] ? 'Hide MCQ' : 'Reveal MCQ'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              aria-label="Reset all answers"
              className={cn(btnBase, 'border border-ga-red/60 text-ga-red hover:bg-ga-red/10')}
            >
              Reset answers
            </button>

            <button
              type="button"
              onClick={handleExport}
              aria-label="Export state as JSON"
              className={cn(
                btnBase,
                'border border-ga-border-strong text-ga-ink hover:border-ga-primary hover:text-ga-primary'
              )}
            >
              Export JSON
            </button>
          </div>
        </div>
      )}

      {/* Collapsed chip */}
      <button
        ref={chipRef}
        type="button"
        aria-label={open ? 'Collapse dev toolbar' : 'Expand dev toolbar'}
        aria-expanded={open}
        aria-controls="dev-toolbar-panel"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto rounded-ga-sm px-3 py-1.5 font-mono text-xs font-bold shadow-ga-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
          open ? 'bg-ga-primary text-white' : 'bg-ga-ink text-white hover:bg-ga-primary'
        )}
      >
        DEV
      </button>
    </div>
  )
}
