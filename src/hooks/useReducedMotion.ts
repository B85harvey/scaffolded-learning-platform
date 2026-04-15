import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Returns true when the user has requested reduced motion via OS settings.
 *
 * Side effect: sets `data-reduced-motion="true|false"` on `<html>` so that
 * CSS custom properties and selectors can gate animation durations without
 * per-component checks. Call this hook once near the root of the app.
 *
 * CSS transitions are also suppressed globally by the `@media` rule in
 * index.css; the data attribute approach additionally handles CSS animations
 * that use the `--ga-duration-*` custom properties.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY)

    const applyToHtml = (value: boolean) => {
      document.documentElement.dataset.reducedMotion = String(value)
    }

    applyToHtml(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
      applyToHtml(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return reducedMotion
}
