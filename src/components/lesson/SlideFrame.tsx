import { useRef } from 'react'
import { useFocusOnMount } from '@/hooks/useFocusOnMount'
import type { SlideConfig } from '@/lessons/types'

interface SlideFrameProps {
  slide: SlideConfig
  isLocked: boolean
  children: React.ReactNode
}

/**
 * Wraps each slide with a stable `key` in the parent so React remounts it on
 * slide change. On mount the CSS animation `slide-enter` runs (defined in
 * index.css) and focus transfers to the first tabbable element inside.
 *
 * Lock overlay traps focus via `role="dialog"` and `aria-modal` so keyboard
 * users cannot reach the underlying slide inputs while locked.
 */
export function SlideFrame({ slide, isLocked, children }: SlideFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusOnMount(containerRef)

  return (
    <div className="relative">
      {/* Slide card */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="slide-enter relative rounded-ga-lg bg-ga-surface p-8 shadow-ga-md outline-none"
        aria-label={`Slide ${slide.id}`}
      >
        {children}
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-overlay-heading"
          className="absolute inset-0 flex flex-col items-center justify-center rounded-ga-lg"
          style={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ga-primary/10"
              aria-hidden="true"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ga-primary"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2
              id="lock-overlay-heading"
              className="font-sans text-lg font-semibold leading-6 text-ga-ink"
            >
              Waiting for your teacher
            </h2>
            <p className="max-w-xs font-sans text-sm text-ga-ink-muted">
              Your teacher will unlock this slide when the class is ready to move on.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
