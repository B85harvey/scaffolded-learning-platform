/**
 * UnitView tests.
 *
 * Mocks useAuth, supabase, and AppNav.
 * Verifies lesson card states: in_progress with slide counter, complete with
 * "View Action Plan" link, and the unit-closed banner.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UnitView } from './UnitView'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    class_members: [{ class_id: 'class-1' }],
    unit_assignments: [],
    lesson_progress: [],
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (col: string, val: unknown) => {
        void col
        void val
        return makeBuilder(rows)
      },
      in: (col: string, vals: unknown[]) => {
        void col
        void vals
        return makeBuilder(rows)
      },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }

  return { supabaseMock: { tables, from: (t: string) => makeBuilder(tables[t] ?? []) } }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  vi.resetAllMocks()
  supabaseMock.tables['class_members'] = [{ class_id: 'class-1' }]
  supabaseMock.tables['unit_assignments'] = [{ status: 'open' }]
  supabaseMock.tables['lesson_progress'] = []

  mockUseAuth.mockReturnValue({
    session: { user: { id: 'student-1' } } as never,
    profile: null,
    loading: false,
    signOut: vi.fn(),
  })
})

function renderUnitView(unitId = 'unit-2') {
  return render(
    <MemoryRouter initialEntries={[`/unit/${unitId}`]}>
      <Routes>
        <Route path="/unit/:unitId" element={<UnitView />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UnitView — in_progress lesson', () => {
  it('shows "In progress" badge and slide X of Y counter', async () => {
    // Slide index 6 (0-based) = Slide 7 of 18
    supabaseMock.tables['lesson_progress'] = [
      {
        lesson_id: 'kitchen-technologies',
        status: 'in_progress',
        current_slide_index: 6,
      },
    ]

    renderUnitView()

    await waitFor(() => {
      expect(screen.getByTestId('status-in-progress')).toBeInTheDocument()
    })

    expect(screen.getByTestId('slide-progress')).toHaveTextContent('Slide 7 of 18')
  })
})

describe('UnitView — complete lesson', () => {
  it('shows "Complete" badge and "View Action Plan" link', async () => {
    supabaseMock.tables['lesson_progress'] = [
      {
        lesson_id: 'kitchen-technologies',
        status: 'complete',
        current_slide_index: 16,
      },
    ]

    renderUnitView()

    await waitFor(() => {
      expect(screen.getByTestId('status-complete')).toBeInTheDocument()
    })

    const link = screen.getByTestId('action-plan-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', expect.stringContaining('/session/kitchen-technologies'))
  })
})

describe('UnitView — not started lesson', () => {
  it('shows no progress badge when there is no lesson_progress row', async () => {
    supabaseMock.tables['lesson_progress'] = []

    renderUnitView()

    await waitFor(() => {
      expect(screen.getByTestId('lesson-card-kitchen-technologies')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('status-in-progress')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-complete')).not.toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
  })
})

describe('UnitView — closed unit banner', () => {
  it('shows a closed banner and non-interactive lesson cards when unit is closed', async () => {
    supabaseMock.tables['unit_assignments'] = [{ status: 'closed' }]

    renderUnitView()

    await waitFor(() => {
      expect(screen.getByTestId('unit-closed-banner')).toBeInTheDocument()
    })

    // Lesson card should be non-interactive (no wrapping <a>)
    const card = screen.getByTestId('lesson-card-kitchen-technologies')
    expect(card.closest('a')).toBeNull()
  })
})
