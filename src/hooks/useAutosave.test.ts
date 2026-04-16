/**
 * useAutosave tests.
 *
 * Mocks Dexie to avoid IndexedDB setup. Verifies the 400 ms debounce and
 * the "rapid changes = one write" behaviour using Vitest fake timers.
 *
 * NOTE: vi.mock factories are hoisted above imports, so the factory must not
 * reference variables declared in the module body. Use vi.fn() inline and
 * retrieve the mock handle via vi.mocked(db.drafts.put) after import.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from './useAutosave'
import { db } from '@/lib/dexieDb'

// ── Mock dexieDb — factory uses only inline vi.fn() ──────────────────────────

vi.mock('@/lib/dexieDb', () => ({
  db: {
    drafts: { put: vi.fn().mockResolvedValue(undefined) },
  },
}))

const mockPut = vi.mocked(db.drafts.put)

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  mockPut.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAutosave — debounce', () => {
  it('does not write immediately when value is set', () => {
    renderHook(() => useAutosave('lesson-01', 'slide-01', 'topic', 'initial value'))
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('writes to Dexie after 400 ms', async () => {
    renderHook(() => useAutosave('lesson-01', 'slide-01', 'topic', 'initial value'))

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(mockPut).toHaveBeenCalledOnce()
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'lesson-01:slide-01:topic',
        lessonId: 'lesson-01',
        slideId: 'slide-01',
        promptId: 'topic',
        value: 'initial value',
        syncedAt: null,
      })
    )
  })

  it('does not write before 400 ms have elapsed', async () => {
    renderHook(() => useAutosave('lesson-01', 'slide-01', 'topic', 'initial value'))

    await act(async () => {
      vi.advanceTimersByTime(399)
    })

    expect(mockPut).not.toHaveBeenCalled()
  })
})

describe('useAutosave — rapid changes produce one write', () => {
  it('resets the debounce on each value change', async () => {
    const { rerender } = renderHook(
      ({ value }) => useAutosave('lesson-01', 'slide-01', 'topic', value),
      { initialProps: { value: 'first' } }
    )

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'second' })

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'third' })

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    // 600 ms total but debounce reset twice — still not fired
    expect(mockPut).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    // Now debounce fires — only one write for the final value
    expect(mockPut).toHaveBeenCalledOnce()
    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ value: 'third' }))
  })
})

describe('useAutosave — dirty flag', () => {
  it('dirty is true after a value change', () => {
    const { result } = renderHook(() => useAutosave('lesson-01', 'slide-01', 'topic', 'some value'))
    expect(result.current.dirty).toBe(true)
  })
})

describe('useAutosave — written record shape', () => {
  it('uses lessonId:slideId:promptId as the id', async () => {
    renderHook(() => useAutosave('my-lesson', 'my-slide', 'my-prompt', 'hello'))

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'my-lesson:my-slide:my-prompt' })
    )
  })

  it('sets syncedAt to null on every write', async () => {
    renderHook(() => useAutosave('lesson-01', 'slide-01', 'topic', 'value'))

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ syncedAt: null }))
  })
})
