import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Returns true if the user has requested reduced motion via their OS settings.
 * Use this hook to branch JS-driven animation logic; CSS animations are handled
 * globally by the prefers-reduced-motion media query in index.css.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY)
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return reducedMotion
}
