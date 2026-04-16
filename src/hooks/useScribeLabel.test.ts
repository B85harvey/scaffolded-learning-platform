/**
 * useScribeLabel tests.
 *
 * Verifies:
 *   - Returns "Scribe: <name>" when another student is the scribe.
 *   - Returns "You are the scribe" when the current student is the scribe.
 *   - Returns "No group assigned" when no group data exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useScribeLabel } from './useScribeLabel'

// ── Flexible mock builder ─────────────────────────────────────────────────────

type Resolver = () => Promise<{ data: unknown; error: null }>

const { fromMock } = vi.hoisted(() => {
  // Per-table queues: each element is the response for the Nth call.
  const tableQueues: Record<string, unknown[][]> = {}
  const thenQueues: Record<string, unknown[][]> = {}
  const callCounts: Record<string, number> = {}
  const thenCounts: Record<string, number> = {}

  function makeBuilder(table: string): Record<string, unknown> {
    const builder: Record<string, unknown> = {
      select: () => makeBuilder(table),
      eq: (_c: string, _v: unknown) => {
        void _c
        void _v
        return makeBuilder(table)
      },
      in: (_c: string, _v: unknown[]) => {
        void _c
        void _v
        return makeBuilder(table)
      },
      maybeSingle: (): Resolver => {
        const count = callCounts[table] ?? 0
        callCounts[table] = count + 1
        const queue = tableQueues[table] ?? [[null]]
        const row = (queue[count] ?? queue[queue.length - 1])[0] ?? null
        return Promise.resolve({ data: row, error: null }) as unknown as Resolver
      },
      then: (resolve: (v: unknown) => void) => {
        const count = thenCounts[table] ?? 0
        thenCounts[table] = count + 1
        const queue = thenQueues[table] ?? [[]]
        const rows = queue[count] ?? queue[queue.length - 1]
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return builder
  }

  return {
    fromMock: {
      tableQueues,
      thenQueues,
      callCounts,
      thenCounts,
      reset() {
        for (const k of Object.keys(tableQueues)) delete tableQueues[k]
        for (const k of Object.keys(thenQueues)) delete thenQueues[k]
        for (const k of Object.keys(callCounts)) delete callCounts[k]
        for (const k of Object.keys(thenCounts)) delete thenCounts[k]
      },
      from: (t: string) => makeBuilder(t),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => fromMock.from(t) },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  fromMock.reset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useScribeLabel — no group data', () => {
  it('returns "No group assigned" when no groups exist for the lesson', async () => {
    // groups table returns [] (no groups)
    fromMock.thenQueues['groups'] = [[]]

    const { result } = renderHook(() => useScribeLabel('lesson-1', 'student-1'))

    // Initial value
    expect(result.current).toBe('No group assigned')

    // After fetch completes it should still be 'No group assigned'
    await waitFor(() => expect(result.current).toBe('No group assigned'))
  })

  it('returns "No group assigned" when studentId is null', async () => {
    const { result } = renderHook(() => useScribeLabel('lesson-1', null))
    expect(result.current).toBe('No group assigned')
  })

  it('returns "No group assigned" when student is not in any group', async () => {
    fromMock.thenQueues['groups'] = [[{ id: 'group-1' }]]
    // student not in group_members
    fromMock.tableQueues['group_members'] = [[null]]

    const { result } = renderHook(() => useScribeLabel('lesson-1', 'student-1'))

    await waitFor(() => expect(result.current).toBe('No group assigned'))
  })
})

describe('useScribeLabel — current user is scribe', () => {
  it('returns "You are the scribe" when is_scribe is true', async () => {
    fromMock.thenQueues['groups'] = [[{ id: 'group-1' }]]
    // student is the scribe
    fromMock.tableQueues['group_members'] = [[{ group_id: 'group-1', is_scribe: true }]]

    const { result } = renderHook(() => useScribeLabel('lesson-1', 'student-1'))

    await waitFor(() => expect(result.current).toBe('You are the scribe'))
  })
})

describe('useScribeLabel — another student is scribe', () => {
  it('returns "Scribe: <name>" when another student is the scribe', async () => {
    fromMock.thenQueues['groups'] = [[{ id: 'group-1' }]]
    // student is NOT the scribe; two group_members calls
    fromMock.tableQueues['group_members'] = [
      [{ group_id: 'group-1', is_scribe: false }], // first call: student's membership
      [{ student_id: 'scribe-user' }], // second call: scribe member
    ]
    fromMock.tableQueues['profiles'] = [[{ display_name: 'Jane Smith', email: null }]]

    const { result } = renderHook(() => useScribeLabel('lesson-1', 'student-1'))

    await waitFor(() => expect(result.current).toBe('Scribe: Jane Smith'))
  })

  it('falls back to email when display_name is null', async () => {
    fromMock.thenQueues['groups'] = [[{ id: 'group-1' }]]
    fromMock.tableQueues['group_members'] = [
      [{ group_id: 'group-1', is_scribe: false }],
      [{ student_id: 'scribe-user' }],
    ]
    fromMock.tableQueues['profiles'] = [[{ display_name: null, email: 'scribe@school.edu.au' }]]

    const { result } = renderHook(() => useScribeLabel('lesson-1', 'student-1'))

    await waitFor(() => expect(result.current).toBe('Scribe: scribe@school.edu.au'))
  })
})
