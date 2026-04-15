import { useEffect, type RefObject } from 'react'

const TABBABLE = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * On mount, focuses the first tabbable element inside `containerRef`.
 * Falls back to focusing the container itself (with tabIndex={-1}) when
 * no tabbable descendant exists, ensuring keyboard and screen reader users
 * land somewhere meaningful on every slide transition.
 *
 * Because SlideFrame uses `key={slide.id}`, React remounts the component on
 * every slide change, so this effect fires on every transition automatically.
 */
export function useFocusOnMount(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const first = el.querySelector<HTMLElement>(TABBABLE)
    if (first) {
      first.focus({ preventScroll: true })
    } else {
      el.focus({ preventScroll: true })
    }
  }, [containerRef])
}
