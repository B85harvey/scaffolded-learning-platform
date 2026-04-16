/**
 * AdminUnitManager tests.
 *
 * Mocks useAuth (teacher), supabase, and AppNav.
 * Verifies: Open button calls upsert, Close button triggers confirm dialog,
 * confirming calls update with status 'closed'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminUnitManager } from './AdminUnitManager'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    classes: [{ id: 'class-1', teacher_id: 'teacher-1' }],
    unit_assignments: [],
  }

  // Record upsert / update calls for assertions.
  const upsertCalls: unknown[] = []
  const updateCalls: Array<{ data: unknown; filters: Array<[string, unknown]> }> = []

  function makeUpdateBuilder(data: unknown, filters: Array<[string, unknown]> = []) {
    return {
      eq: (col: string, val: unknown) => makeUpdateBuilder(data, [...filters, [col, val]]),
      then: (resolve: (v: unknown) => void) => {
        updateCalls.push({ data, filters })
        return Promise.resolve({ error: null }).then(resolve)
      },
    }
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (col: string, val: unknown) => {
        void col
        void val
        return makeBuilder(rows)
      },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
      upsert: (data: unknown, opts?: unknown) => {
        void opts
        upsertCalls.push(data)
        return {
          then: (resolve: (v: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
        }
      },
      update: (data: unknown) => makeUpdateBuilder(data),
    }
  }

  return {
    supabaseMock: {
      tables,
      upsertCalls,
      updateCalls,
      from: (t: string) => makeBuilder(tables[t] ?? []),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const TEACHER = {
  session: { user: { id: 'teacher-1' } } as never,
  profile: {
    id: 'teacher-1',
    email: 'teacher@school.edu.au',
    role: 'teacher' as const,
    display_name: 'Ms Harvey',
    created_at: '',
    updated_at: '',
  },
  loading: false,
  signOut: vi.fn(),
}

beforeEach(() => {
  vi.resetAllMocks()
  supabaseMock.tables['classes'] = [{ id: 'class-1', teacher_id: 'teacher-1' }]
  supabaseMock.tables['unit_assignments'] = []
  supabaseMock.upsertCalls.length = 0
  supabaseMock.updateCalls.length = 0
  mockUseAuth.mockReturnValue(TEACHER)
})

function renderManager() {
  return render(
    <MemoryRouter>
      <AdminUnitManager />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminUnitManager — Open button', () => {
  it('calls supabase upsert with status "open" when Open is clicked', async () => {
    const user = userEvent.setup()
    // No assignments → all units start as 'draft'
    supabaseMock.tables['unit_assignments'] = []

    renderManager()

    await waitFor(() => screen.getByTestId('unit-row-unit-2'))

    await user.click(screen.getByTestId('open-btn-unit-2'))

    await waitFor(() => {
      expect(supabaseMock.upsertCalls.length).toBe(1)
    })

    const call = supabaseMock.upsertCalls[0] as Record<string, unknown>
    expect(call).toMatchObject({ unit_id: 'unit-2', class_id: 'class-1', status: 'open' })
    expect(call['opened_at']).toBeTruthy()
  })
})

describe('AdminUnitManager — Close button shows confirmation dialog', () => {
  it('shows a confirm dialog when Close is clicked, then calls update on confirm', async () => {
    const user = userEvent.setup()
    // Unit-2 starts as 'open'
    supabaseMock.tables['unit_assignments'] = [
      { unit_id: 'unit-2', class_id: 'class-1', status: 'open' },
    ]

    renderManager()

    await waitFor(() => screen.getByTestId('close-btn-unit-2'))

    // Click Close — dialog should appear.
    await user.click(screen.getByTestId('close-btn-unit-2'))
    expect(screen.getByTestId('confirm-close-dialog')).toBeInTheDocument()

    // Confirm the close.
    await user.click(screen.getByTestId('confirm-close-btn'))

    await waitFor(() => {
      expect(supabaseMock.updateCalls.length).toBe(1)
    })

    const call = supabaseMock.updateCalls[0]
    expect(call.data).toMatchObject({ status: 'closed' })
    expect(call.data as Record<string, unknown>).toHaveProperty('closed_at')
  })
})

describe('AdminUnitManager — Cancel closes dialog without calling update', () => {
  it('dismisses the dialog without updating when Cancel is clicked', async () => {
    const user = userEvent.setup()
    supabaseMock.tables['unit_assignments'] = [
      { unit_id: 'unit-2', class_id: 'class-1', status: 'open' },
    ]

    renderManager()

    await waitFor(() => screen.getByTestId('close-btn-unit-2'))
    await user.click(screen.getByTestId('close-btn-unit-2'))
    expect(screen.getByTestId('confirm-close-dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByTestId('confirm-close-dialog')).not.toBeInTheDocument()
    expect(supabaseMock.updateCalls.length).toBe(0)
  })
})

describe('AdminUnitManager — unit list renders from registry', () => {
  it('shows all units from the UNITS registry', async () => {
    renderManager()

    await waitFor(() => {
      expect(screen.getByTestId('unit-row-unit-2')).toBeInTheDocument()
    })
    expect(screen.getByTestId('unit-row-unit-3')).toBeInTheDocument()
  })
})
