/**
 * ProtectedRoute tests.
 *
 * Mocks useAuth so we can control session/loading state without spinning up
 * a real Supabase client. Rendered inside MemoryRouter so <Navigate> works.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/signin" element={<div>Sign in page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute — loading state', () => {
  it('shows a loading spinner while auth state is being determined', () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: true, signOut: vi.fn() })
    renderWithRouter()
    expect(screen.getByRole('main', { name: 'Loading…' })).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })
})

describe('ProtectedRoute — unauthenticated', () => {
  it('redirects to /auth/signin when there is no session', () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, signOut: vi.fn() })
    renderWithRouter()
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })
})

describe('ProtectedRoute — authenticated student', () => {
  it('renders children when a student session exists', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'student-1', email: 'student@school.edu.au' } } as never,
      profile: {
        id: 'student-1',
        email: 'student@school.edu.au',
        role: 'student',
        display_name: null,
        created_at: '',
        updated_at: '',
      },
      loading: false,
      signOut: vi.fn(),
    })
    renderWithRouter()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})

describe('ProtectedRoute — authenticated teacher', () => {
  it('renders children when a teacher session exists', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'teacher-1', email: 'teacher@school.edu.au' } } as never,
      profile: {
        id: 'teacher-1',
        email: 'teacher@school.edu.au',
        role: 'teacher',
        display_name: 'Ms Harvey',
        created_at: '',
        updated_at: '',
      },
      loading: false,
      signOut: vi.fn(),
    })
    renderWithRouter()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})
