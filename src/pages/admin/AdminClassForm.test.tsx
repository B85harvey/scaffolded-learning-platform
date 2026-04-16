/**
 * AdminClassForm tests.
 *
 * Mocks useAuth (teacher session) and the Supabase client so we can drive
 * the invite form and member table without network calls.
 *
 * Scenarios:
 *   1. Submit 3 valid emails + 1 invalid → verify 3 invites sent, 1 rejected.
 *   2. Members table renders rows returned from the Supabase mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
// vi.mock is hoisted, so this import picks up mocked dependencies.
import { AdminClassForm } from './AdminClassForm'

// ── Auth mock ─────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ── AppNav mock — avoids pulling in full auth navigation ─────────────────────

vi.mock('@/components/AppNav', () => ({
  AppNav: () => <nav aria-label="Main navigation" />,
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    classes: [],
    class_members: [],
    profiles: [],
  }

  // Track calls to auth.signInWithOtp so tests can assert on them.
  const otpCalls: string[] = []

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
      insert: (data: unknown) => {
        void data
        return {
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
          }),
        }
      },
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }

  return {
    supabaseMock: {
      tables,
      otpCalls,
      from: (table: string) => makeBuilder(tables[table] ?? []),
      auth: {
        signInWithOtp: ({ email }: { email: string }) => {
          otpCalls.push(email)
          return Promise.resolve({ error: null })
        },
      },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => supabaseMock.from(t),
    auth: { signInWithOtp: (opts: { email: string }) => supabaseMock.auth.signInWithOtp(opts) },
  },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const TEACHER = {
  session: { user: { id: 'teacher-1', email: 'teacher@school.edu.au' } } as never,
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
  supabaseMock.otpCalls.length = 0
  supabaseMock.tables['classes'] = [{ id: 'class-1', name: 'My Class' }]
  supabaseMock.tables['class_members'] = []
  supabaseMock.tables['profiles'] = []
  mockUseAuth.mockReturnValue(TEACHER)
})

function renderForm() {
  return render(
    <MemoryRouter>
      <AdminClassForm />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminClassForm — invite form: 3 valid + 1 invalid email', () => {
  it('sends 3 invites and rejects 1 invalid email', async () => {
    const user = userEvent.setup()
    renderForm()

    // Wait for the class name to appear (mount effect resolved).
    await waitFor(() => screen.getByText('My Class'))

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(
      textarea,
      'alice@school.edu.au\nbob@school.edu.au\ncharlie@school.edu.au\nnot-an-email'
    )

    await user.click(screen.getByRole('button', { name: /send invites/i }))

    const results = await screen.findByTestId('invite-results')

    // 3 invites sent.
    expect(within(results).getByText('3')).toBeInTheDocument()
    expect(within(results).getByText(/invite/i)).toBeInTheDocument()

    // 1 invalid email rejected.
    expect(within(results).getByText('1')).toBeInTheDocument()
    expect(within(results).getByText(/invalid/i)).toBeInTheDocument()

    // OTP called exactly 3 times.
    expect(supabaseMock.otpCalls).toHaveLength(3)
    expect(supabaseMock.otpCalls).toContain('alice@school.edu.au')
    expect(supabaseMock.otpCalls).toContain('bob@school.edu.au')
    expect(supabaseMock.otpCalls).toContain('charlie@school.edu.au')
  })
})

describe('AdminClassForm — members table renders existing members', () => {
  it('shows enrolled students fetched from Supabase', async () => {
    supabaseMock.tables['class_members'] = [
      { student_id: 'student-1', joined_at: '2026-03-01T00:00:00Z' },
      { student_id: 'student-2', joined_at: '2026-03-02T00:00:00Z' },
    ]
    supabaseMock.tables['profiles'] = [
      { id: 'student-1', email: 'alice@school.edu.au', display_name: 'Alice' },
      { id: 'student-2', email: 'bob@school.edu.au', display_name: null },
    ]

    renderForm()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    expect(screen.getByText('bob@school.edu.au')).toBeInTheDocument()

    const activeChips = screen.getAllByText('Active')
    expect(activeChips).toHaveLength(2)
  })
})
