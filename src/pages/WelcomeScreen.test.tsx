/**
 * WelcomeScreen tests.
 *
 * Mocks useAuth and supabase so we can control displayed class name and
 * student email without network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
// vi.mock is hoisted, so this import picks up mocked dependencies.
import { WelcomeScreen } from './WelcomeScreen'

// ── Auth mock ─────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => {
  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (col: string, val: unknown) => {
        void col
        void val
        return makeBuilder(rows)
      },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    }
  }

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'class_members') return makeBuilder([{ class_id: 'class-1' }])
        if (table === 'classes') return makeBuilder([{ id: 'class-1', name: 'Year 11 Food Tech' }])
        return makeBuilder([])
      },
    },
  }
})

// ── Setup ─────────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

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

  mockUseAuth.mockReturnValue({
    session: {
      user: { id: 'student-1', email: 'student@school.edu.au' },
    } as never,
    profile: {
      id: 'student-1',
      email: 'student@school.edu.au',
      display_name: null,
      role: 'student',
      created_at: '',
      updated_at: '',
    },
    loading: false,
    signOut: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/home" element={<div data-testid="home-page">Home page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WelcomeScreen — renders class name and student identity', () => {
  it('shows the class name and student email in the heading', async () => {
    renderWelcome()

    await waitFor(() => {
      expect(screen.getByText(/Year 11 Food Tech/)).toBeInTheDocument()
    })

    expect(screen.getByText(/student@school\.edu\.au/)).toBeInTheDocument()
  })
})

describe('WelcomeScreen — "Get started" navigates to /home', () => {
  it('navigates to /home and sets the localStorage flag', async () => {
    const user = userEvent.setup()
    renderWelcome()

    await waitFor(() => screen.getByRole('button', { name: /get started/i }))
    await user.click(screen.getByRole('button', { name: /get started/i }))

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    expect(localStorage.getItem('welcome_seen')).toBe('1')
  })
})

describe('WelcomeScreen — Skip navigates to /home', () => {
  it('navigates to /home and sets the localStorage flag when Skip is clicked', async () => {
    const user = userEvent.setup()
    renderWelcome()

    await user.click(screen.getByRole('button', { name: /skip/i }))

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
    expect(localStorage.getItem('welcome_seen')).toBe('1')
  })
})
