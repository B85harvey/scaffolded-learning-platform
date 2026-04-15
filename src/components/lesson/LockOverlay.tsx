import { Lock } from 'lucide-react'

/**
 * A 50 % white scrim that covers the current slide and traps focus while the
 * teacher has locked the slide. The single "OK, I'll wait" button is the only
 * focusable target inside the dialog, satisfying the focus trap without any
 * JavaScript focus management library.
 *
 * The overlay is positioned absolutely inside SlideFrame's relative container;
 * slide content beneath remains in the DOM but is marked `inert` so keyboard
 * and screen reader users cannot reach it.
 */
export function LockOverlay() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-overlay-heading"
      data-testid="lock-overlay"
      className="absolute inset-0 flex flex-col items-center justify-center rounded-ga-lg"
      style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
    >
      <div className="flex flex-col items-center gap-4 rounded-ga-lg bg-white p-8 text-center shadow-ga-md">
        {/* Lock icon */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ga-primary/10"
          aria-hidden="true"
        >
          <Lock size={22} className="text-ga-primary" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h2
          id="lock-overlay-heading"
          className="font-sans text-lg font-semibold leading-6 text-ga-ink"
        >
          Waiting for your teacher
        </h2>

        {/* Focus-trap button — does nothing, exists so the dialog has a tabbable target */}
        <button
          type="button"
          autoFocus
          className="rounded-ga-sm border border-ga-border-strong px-5 py-2 font-sans text-sm font-medium text-ga-ink transition-colors hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2"
        >
          OK, I'll wait
        </button>
      </div>
    </div>
  )
}
