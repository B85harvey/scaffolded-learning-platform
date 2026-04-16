/**
 * StudentHome tests.
 *
 * Mocks useAuth, supabase, and AppNav.
 * Verifies open/closed unit cards and the empty state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentHome } from './StudentHome'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))

// Supabase mock — table-based, all chains return rows unfiltered.
const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    class_members: [],
    unit_assignments: [],
    lesson_submissions: [],
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (col: string, val: unknown) => {
        void col
        void val
        return makeBuilder(rows)
      },
      neq: (col: string, val: unknown) => {
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

const STUDENT = {
  session: { user: { id: 'student-1', email: 'student@school.edu.au' } } as never,
  profile: {
    id: 'student-1',
    email: 'student@school.edu.au',
    display_name: 'Alex',
    role: 'student' as const,
    created_at: '',
    updated_at: '',
  },
  loading: false,
  signOut: vi.fn(),
}

beforeEach(() => {
  vi.resetAllMocks()
  supabaseMock.tables['class_members'] = [{ class_id: 'class-1' }]
  supabaseMock.tables['unit_assignments'] = []
  supabaseMock.tables['lesson_submissions'] = []
  mockUseAuth.mockReturnValue(STUDENT)
})

function renderHome() {
  return render(
    <MemoryRouter>
      <StudentHome />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudentHome — open unit card', () => {
  it('renders a clickable open unit card with a progress bar', async () => {
    supabaseMock.tables['unit_assignments'] = [
      { unit_id: 'unit-2', class_id: 'class-1', status: 'open' },
    ]
    supabaseMock.tables['lesson_submissions'] = []

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('unit-card-unit-2')).toBeInTheDocument()
    })

    // Should be wrapped in a link (clickable)
    const card = screen.getByTestId('unit-card-unit-2')
    const link = card.closest('a')
    expect(link).toHaveAttribute('href', '/unit/unit-2')

    // Progress bar present
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // Completion percentage shown
    expect(screen.getByTestId('completion-pct')).toHaveTextContent('0%')

    // No "Closed" badge
    expect(screen.queryByTestId('closed-badge')).not.toBeInTheDocument()
  })
})

describe('StudentHome — closed unit card', () => {
  it('renders a greyed closed unit card with a Closed badge', async () => {
    supabaseMock.tables['unit_assignments'] = [
      { unit_id: 'unit-2', class_id: 'class-1', status: 'closed' },
    ]

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('unit-card-unit-2')).toBeInTheDocument()
    })

    // Should NOT be a link
    const card = screen.getByTestId('unit-card-unit-2')
    expect(card.closest('a')).toBeNull()

    // Closed badge present
    expect(screen.getByTestId('closed-badge')).toBeInTheDocument()

    // Card is visually greyed (opacity-60 class)
    expect(card.className).toContain('opacity-60')
  })
})

describe('StudentHome — draft unit hidden', () => {
  it('does not render draft unit assignments', async () => {
    supabaseMock.tables['unit_assignments'] = [
      { unit_id: 'unit-2', class_id: 'class-1', status: 'draft' },
    ]

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('unit-card-unit-2')).not.toBeInTheDocument()
  })
})

describe('StudentHome — empty state', () => {
  it('shows the empty state message when no units are assigned', async () => {
    supabaseMock.tables['unit_assignments'] = []

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    expect(screen.getByText(/no units available yet/i)).toBeInTheDocument()
  })
})

describe('StudentHome — welcome header', () => {
  it('shows the student display name in the heading', async () => {
    supabaseMock.tables['unit_assignments'] = []

    renderHome()

    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, Alex')
  })
})
