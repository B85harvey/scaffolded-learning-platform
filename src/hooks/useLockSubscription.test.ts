/**
 * useLockSubscription tests.
 *
 * Verifies:
 *   - Initial fetch dispatches SET_LOCK for each slide_locks row.
 *   - Realtime UPDATE events dispatch SET_LOCK.
 *   - CHANNEL_ERROR triggers setInterval (polling starts).
 *   - SUBSCRIBED after CHANNEL_ERROR calls clearInterval (polling stops).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLockSubscription } from './useLockSubscription'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  let realtimeHandler: ((payload: { new: { slide_id: string; locked: boolean } }) => void) | null =
    null
  let statusCallback: ((status: string) => void) | null = null

  const tables: Record<string, unknown[]> = {
    slide_locks: [
      { slide_id: 'slide-1', locked: true },
      { slide_id: 'slide-2', locked: false },
    ],
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (_col: string, _val: unknown) => {
        void _col
        void _val
        return makeBuilder(rows)
      },
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }

  const channelMock = {
    on: vi
      .fn()
      .mockImplementation(
        (
          _event: unknown,
          _filter: unknown,
          handler: (payload: { new: { slide_id: string; locked: boolean } }) => void
        ) => {
          void _event
          void _filter
          realtimeHandler = handler
          return channelMock
        }
      ),
    subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
      statusCallback = cb
      return channelMock
    }),
  }

  return {
    supabaseMock: {
      tables,
      channel: channelMock,
      getRealtimeHandler: () => realtimeHandler,
      getStatusCallback: () => statusCallback,
      removeChannel: vi.fn(),
      from: (t: string) => makeBuilder(tables[t] ?? []),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => supabaseMock.from(t),
    channel: (_name: string) => {
      void _name
      return supabaseMock.channel
    },
    removeChannel: supabaseMock.removeChannel,
  },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
  supabaseMock.tables['slide_locks'] = [
    { slide_id: 'slide-1', locked: true },
    { slide_id: 'slide-2', locked: false },
  ]

  // Re-attach the implementations after resetAllMocks.
  supabaseMock.channel.on.mockImplementation(
    (
      _event: unknown,
      _filter: unknown,
      handler: (payload: { new: { slide_id: string; locked: boolean } }) => void
    ) => {
      void _event
      void _filter
      // store handler via closure mutation
      const mock = supabaseMock as unknown as { _realtimeHandler: typeof handler }
      mock._realtimeHandler = handler
      return supabaseMock.channel
    }
  )
  supabaseMock.channel.subscribe.mockImplementation((cb: (status: string) => void) => {
    const mock = supabaseMock as unknown as { _statusCallback: typeof cb }
    mock._statusCallback = cb
    return supabaseMock.channel
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fireRealtimeEvent(payload: { new: { slide_id: string; locked: boolean } }) {
  const handler = (
    supabaseMock as unknown as {
      _realtimeHandler?: typeof payload extends infer P ? (p: P) => void : never
    }
  )._realtimeHandler
  if (handler) (handler as (p: typeof payload) => void)(payload)
}

function fireStatusEvent(status: string) {
  const cb = (supabaseMock as unknown as { _statusCallback?: (s: string) => void })._statusCallback
  if (cb) cb(status)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLockSubscription — initial fetch', () => {
  it('dispatches SET_LOCK for each slide_locks row on mount', async () => {
    const dispatch = vi.fn()
    const { unmount } = renderHook(() => useLockSubscription('lesson-1', dispatch, true))

    // Flush microtasks
    await new Promise<void>((r) => setTimeout(r, 0))

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LOCK', slideId: 'slide-1', locked: true })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LOCK', slideId: 'slide-2', locked: false })

    unmount()
  })

  it('does nothing when enabled is false', async () => {
    const dispatch = vi.fn()
    const { unmount } = renderHook(() => useLockSubscription('lesson-1', dispatch, false))

    await new Promise<void>((r) => setTimeout(r, 0))

    expect(dispatch).not.toHaveBeenCalled()
    unmount()
  })
})

describe('useLockSubscription — realtime events', () => {
  it('dispatches SET_LOCK when a realtime event fires', async () => {
    const dispatch = vi.fn()
    const { unmount } = renderHook(() => useLockSubscription('lesson-1', dispatch, true))

    await new Promise<void>((r) => setTimeout(r, 0))
    dispatch.mockClear()

    fireRealtimeEvent({ new: { slide_id: 'slide-3', locked: true } })

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LOCK', slideId: 'slide-3', locked: true })

    unmount()
  })
})

describe('useLockSubscription — polling fallback', () => {
  it('calls setInterval when CHANNEL_ERROR fires', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const dispatch = vi.fn()

    const { unmount } = renderHook(() => useLockSubscription('lesson-1', dispatch, true))
    await new Promise<void>((r) => setTimeout(r, 0))

    fireStatusEvent('CHANNEL_ERROR')

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10_000)

    unmount()
    setIntervalSpy.mockRestore()
  })

  it('calls setInterval when TIMED_OUT fires', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const dispatch = vi.fn()

    const { unmount } = renderHook(() => useLockSubscription('lesson-1', dispatch, true))
    await new Promise<void>((r) => setTimeout(r, 0))

    fireStatusEvent('TIMED_OUT')

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10_000)

    unmount()
    setIntervalSpy.mockRestore()
  })

  it('calls clearInterval when SUBSCRIBED fires after an error', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const dispatch = vi.fn()

    const { unmount } = renderHook(() => useLockSubscription('lesson-1', dispatch, true))
    await new Promise<void>((r) => setTimeout(r, 0))

    fireStatusEvent('CHANNEL_ERROR') // start polling
    fireStatusEvent('SUBSCRIBED') // reconnect — stop polling

    expect(clearIntervalSpy).toHaveBeenCalled()

    unmount()
    clearIntervalSpy.mockRestore()
  })
})
