import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from './useReducedMotion'

// ── matchMedia mock helpers ───────────────────────────────────────────────────

type MockMediaQueryList = {
  matches: boolean
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  dispatchChange: (matches: boolean) => void
}

function makeMockMQL(initialMatches: boolean): MockMediaQueryList {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  return {
    matches: initialMatches,
    addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      const idx = listeners.indexOf(cb)
      if (idx !== -1) listeners.splice(idx, 1)
    }),
    dispatchChange(matches: boolean) {
      listeners.forEach((cb) => cb({ matches }))
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useReducedMotion', () => {
  let mql: MockMediaQueryList

  beforeEach(() => {
    mql = makeMockMQL(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    )
    // Reset the html attribute
    delete document.documentElement.dataset.reducedMotion
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when prefers-reduced-motion does not match', () => {
    mql.matches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when prefers-reduced-motion matches on init', () => {
    mql.matches = true
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    )
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when the media query fires a change event', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      mql.dispatchChange(true)
    })

    expect(result.current).toBe(true)
  })

  it('sets data-reduced-motion="false" on <html> when not reduced', () => {
    mql.matches = false
    renderHook(() => useReducedMotion())
    expect(document.documentElement.dataset.reducedMotion).toBe('false')
  })

  it('sets data-reduced-motion="true" on <html> when reduced', () => {
    mql.matches = true
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql)
    )
    renderHook(() => useReducedMotion())
    expect(document.documentElement.dataset.reducedMotion).toBe('true')
  })

  it('updates data-reduced-motion on <html> when the preference changes', () => {
    renderHook(() => useReducedMotion())
    expect(document.documentElement.dataset.reducedMotion).toBe('false')

    act(() => {
      mql.dispatchChange(true)
    })

    expect(document.documentElement.dataset.reducedMotion).toBe('true')
  })

  it('removes the event listener on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion())
    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledOnce()
  })
})
