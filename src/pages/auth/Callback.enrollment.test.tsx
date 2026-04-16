/**
 * Callback — enrolment routing tests.
 *
 * Kept separate from any other Callback tests so vi.mock calls here do not
 * interfere.
 *
 * Three scenarios:
 *   1. First-time student (class_members row exists, no lesson_progress) → /welcome
 *   2. Returning student (class_members row exists, lesson_progress exists) → /home
 *   3. Non-enrolled user (no class_members row) → "not enrolled" message
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
// vi.mock is hoisted, so this import picks up mocked dependencies.
import { Callback } from './Callback'

// ── Navigate mock ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  type Row = Record<string, unknown>

  const tables: Record<string, Row[]> = {
    profiles: [],
    class_members: [],
    lesson_progress: [],
  }

  function makeBuilder(rows: Row[]) {
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
    }
  }

  return {
    supabaseMock: {
      tables,
      from: (table: string) => makeBuilder(tables[table] ?? []),
      auth: {
        exchangeCodeForSession: vi.fn(),
      },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => supabaseMock.from(t),
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        supabaseMock.auth.exchangeCodeForSession(...args),
    },
  },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

/** In-memory localStorage substitute (jsdom storage stub is incomplete here). */
function makeLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('localStorage', makeLocalStorage())
  supabaseMock.tables['profiles'] = []
  supabaseMock.tables['class_members'] = []
  supabaseMock.tables['lesson_progress'] = []

  // Default: successful code exchange.
  supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
    error: null,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={['/auth/callback?code=abc']}>
      <Routes>
        <Route path="/auth/callback" element={<Callback />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Callback — first-time student', () => {
  it('redirects to /welcome when enrolled but no lesson progress', async () => {
    supabaseMock.tables['profiles'] = [{ id: 'user-1', role: 'student' }]
    supabaseMock.tables['class_members'] = [{ id: 'cm-1', student_id: 'user-1' }]
    supabaseMock.tables['lesson_progress'] = []

    renderCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/welcome', { replace: true })
    })
  })
})

describe('Callback — returning student', () => {
  it('redirects to /home when enrolled with existing lesson progress', async () => {
    supabaseMock.tables['profiles'] = [{ id: 'user-1', role: 'student' }]
    supabaseMock.tables['class_members'] = [{ id: 'cm-1', student_id: 'user-1' }]
    supabaseMock.tables['lesson_progress'] = [
      { id: 'lp-1', student_id: 'user-1', lesson_id: 'kitchen-technologies' },
    ]

    renderCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true })
    })
  })
})

describe('Callback — non-enrolled user', () => {
  it('shows the not-enrolled message when there is no class_members row', async () => {
    supabaseMock.tables['profiles'] = [{ id: 'user-1', role: 'student' }]
    supabaseMock.tables['class_members'] = []

    renderCallback()

    await waitFor(() => {
      expect(screen.getByText(/not enrolled in any class/i)).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('Callback — auth exchange failure', () => {
  it('shows an error message when the code exchange fails', async () => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid auth code' },
    })

    renderCallback()

    await waitFor(() => {
      expect(screen.getByText('Sign-in failed')).toBeInTheDocument()
      expect(screen.getByText('Invalid auth code')).toBeInTheDocument()
    })
  })
})
