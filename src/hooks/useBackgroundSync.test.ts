/**
 * useBackgroundSync tests.
 *
 * Mocks syncDirtyDrafts. Uses fake timers to verify the 30-second interval
 * behaviour and cleanup on unmount.
 *
 * NOTE: vi.mock factories are hoisted above imports. Use vi.fn() inline in the
 * factory, then retrieve mock handles via vi.mocked() after import.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBackgroundSync } from './useBackgroundSync'
import { syncDirtyDrafts } from '@/lib/syncService'

// ── Mock syncService — inline vi.fn() only ────────────────────────────────────

vi.mock('@/lib/syncService', () => ({
  syncDirtyDrafts: vi.fn().mockResolvedValue(undefined),
  commitToSupabase: vi.fn().mockResolvedValue({ success: true }),
  saveMcqAnswer: vi.fn().mockResolvedValue({ success: true }),
  updateProgress: vi.fn().mockResolvedValue(undefined),
}))

const mockSyncDirtyDrafts = vi.mocked(syncDirtyDrafts)

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  mockSyncDirtyDrafts.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useBackgroundSync — interval', () => {
  it('does not call syncDirtyDrafts immediately on mount', () => {
    renderHook(() => useBackgroundSync('student-uuid', 'lesson-01', true))
    expect(mockSyncDirtyDrafts).not.toHaveBeenCalled()
  })

  it('calls syncDirtyDrafts after 30 seconds', async () => {
    renderHook(() => useBackgroundSync('student-uuid', 'lesson-01', true))

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(mockSyncDirtyDrafts).toHaveBeenCalledOnce()
    expect(mockSyncDirtyDrafts).toHaveBeenCalledWith('student-uuid', 'lesson-01')
  })

  it('calls syncDirtyDrafts again after another 30 seconds', async () => {
    renderHook(() => useBackgroundSync('student-uuid', 'lesson-01', true))

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(mockSyncDirtyDrafts).toHaveBeenCalledTimes(2)
  })
})

describe('useBackgroundSync — cleanup on unmount', () => {
  it('does not call syncDirtyDrafts after unmount', async () => {
    const { unmount } = renderHook(() => useBackgroundSync('student-uuid', 'lesson-01', true))

    unmount()

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(mockSyncDirtyDrafts).not.toHaveBeenCalled()
  })
})

describe('useBackgroundSync — active flag', () => {
  it('does not call syncDirtyDrafts when active is false', async () => {
    renderHook(() => useBackgroundSync('student-uuid', 'lesson-01', false))

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })

    expect(mockSyncDirtyDrafts).not.toHaveBeenCalled()
  })
})
