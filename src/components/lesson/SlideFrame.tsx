import { useRef } from 'react'
import { useFocusOnMount } from '@/hooks/useFocusOnMount'
import { LockOverlay } from './LockOverlay'
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
      {/* Slide card — marked inert when locked so keyboard / AT cannot reach content.
          outline-none: tabIndex={-1} is for programmatic focus only (useFocusOnMount);
          not keyboard-Tab reachable, so no visible focus ring is required here. */}
      <div
        ref={containerRef}
        tabIndex={-1}
        inert={isLocked || undefined}
        data-testid="slide-content"
        className="slide-enter relative rounded-ga-lg bg-ga-surface p-8 shadow-ga-md outline-none"
        aria-label={`Slide ${slide.id}`}
      >
        {children}
      </div>

      {/* Lock overlay — sits above slide content, traps focus via aria-modal */}
      {isLocked && <LockOverlay />}
    </div>
  )
}
