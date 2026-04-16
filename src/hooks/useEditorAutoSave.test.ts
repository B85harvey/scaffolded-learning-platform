/**
 * useEditorAutoSave tests.
 *
 * Uses fake timers to verify debounce behaviour and Supabase call patterns.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockSlideUpdate = vi.fn()
const mockSlideEq = vi.fn()
const mockLessonUpdate = vi.fn()
const mockLessonEq = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'slides') {
        return { update: mockSlideUpdate }
      }
      return { update: mockLessonUpdate }
    }),
  },
}))

const { useEditorAutoSave } = await import('@/hooks/useEditorAutoSave')

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()

  // Re-establish chains cleared by clearAllMocks
  mockSlideUpdate.mockReturnValue({ eq: mockSlideEq })
  mockLessonUpdate.mockReturnValue({ eq: mockLessonEq })
  mockSlideEq.mockResolvedValue({ error: null })
  mockLessonEq.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEditorAutoSave — debounce', () => {
  it('does not fire on initial mount', async () => {
    renderHook(() =>
      useEditorAutoSave({
        lessonId: 'lesson-1',
        slideId: 'slide-1',
        config: { body: 'hello' },
      })
    )

    await act(async () => {
      vi.advanceTimersByTime(1_500)
      await Promise.resolve()
    })

    expect(mockSlideUpdate).not.toHaveBeenCalled()
  })

  it('fires Supabase upsert after 1 second when config changes', async () => {
    const { rerender } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'lesson-1', slideId: 'slide-1', config }),
      { initialProps: { config: { body: 'initial' } } }
    )

    rerender({ config: { body: 'changed' } })

    await act(async () => {
      vi.advanceTimersByTime(1_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockSlideUpdate).toHaveBeenCalledTimes(1)
    expect(mockSlideEq).toHaveBeenCalledWith('id', 'slide-1')
  })

  it('does not fire before the debounce delay elapses', () => {
    const { rerender } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'lesson-1', slideId: 'slide-1', config }),
      { initialProps: { config: { body: 'a' } } }
    )

    rerender({ config: { body: 'b' } })
    vi.advanceTimersByTime(900)

    expect(mockSlideUpdate).not.toHaveBeenCalled()
  })

  it('debounces rapid changes — only one upsert fires', async () => {
    const { rerender } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'lesson-1', slideId: 'slide-1', config }),
      { initialProps: { config: { body: 'v1' } } }
    )

    rerender({ config: { body: 'v2' } })
    vi.advanceTimersByTime(400)
    rerender({ config: { body: 'v3' } })
    vi.advanceTimersByTime(400)
    rerender({ config: { body: 'v4' } })

    await act(async () => {
      vi.advanceTimersByTime(1_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockSlideUpdate).toHaveBeenCalledTimes(1)
  })

  it('does not fire when switching slides (no config change)', async () => {
    const { rerender } = renderHook(
      ({ slideId }) =>
        useEditorAutoSave({
          lessonId: 'lesson-1',
          slideId,
          config: { body: 'same content' },
        }),
      { initialProps: { slideId: 'slide-1' } }
    )

    rerender({ slideId: 'slide-2' })

    await act(async () => {
      vi.advanceTimersByTime(1_500)
    })

    expect(mockSlideUpdate).not.toHaveBeenCalled()
  })
})

describe('useEditorAutoSave — saveStatus', () => {
  it('starts as idle', () => {
    const { result } = renderHook(() =>
      useEditorAutoSave({ lessonId: 'l', slideId: 's', config: {} })
    )
    expect(result.current).toBe('idle')
  })

  it('returns "saved" after successful upsert', async () => {
    const { result, rerender } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'l', slideId: 's', config }),
      { initialProps: { config: { body: 'a' } } }
    )

    rerender({ config: { body: 'b' } })

    await act(async () => {
      vi.advanceTimersByTime(1_000)
      // Flush all pending promises/microtasks
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current).toBe('saved')
  })

  it('returns "error" when Supabase slide upsert fails', async () => {
    mockSlideEq.mockResolvedValue({ error: { message: 'network error' } })

    const { result, rerender } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'l', slideId: 's', config }),
      { initialProps: { config: { body: 'x' } } }
    )

    rerender({ config: { body: 'y' } })

    await act(async () => {
      vi.advanceTimersByTime(1_000)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current).toBe('error')
  })

  it('also updates lessons.updated_at on successful save', async () => {
    const { rerender } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'lesson-abc', slideId: 'slide-x', config }),
      { initialProps: { config: { body: 'a' } } }
    )

    rerender({ config: { body: 'b' } })

    await act(async () => {
      vi.advanceTimersByTime(1_000)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockLessonUpdate).toHaveBeenCalledTimes(1)
    expect(mockLessonEq).toHaveBeenCalledWith('id', 'lesson-abc')
  })
})

describe('useEditorAutoSave — cleanup', () => {
  it('cancels pending timer on unmount — no Supabase call after unmount', async () => {
    const { rerender, unmount } = renderHook(
      ({ config }) => useEditorAutoSave({ lessonId: 'l', slideId: 's', config }),
      { initialProps: { config: { body: 'init' } } }
    )

    rerender({ config: { body: 'edited' } })

    // Unmount before timer fires
    unmount()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    expect(mockSlideUpdate).not.toHaveBeenCalled()
  })
})
