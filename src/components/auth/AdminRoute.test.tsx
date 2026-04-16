/**
 * AdminRoute tests.
 *
 * Mocks useAuth so we can control session, profile, and loading state without
 * a real Supabase client. Rendered inside MemoryRouter so <Navigate> works.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './AdminRoute'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

function renderWithRouter(initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>Admin content</div>
            </AdminRoute>
          }
        />
        <Route path="/auth/signin" element={<div>Sign in page</div>} />
        <Route path="/home" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminRoute — loading state', () => {
  it('shows a loading spinner while auth state is being determined', () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: true, signOut: vi.fn() })
    renderWithRouter()
    expect(screen.getByRole('main', { name: 'Loading…' })).toBeInTheDocument()
  })
})

describe('AdminRoute — unauthenticated', () => {
  it('redirects to /auth/signin when there is no session', () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, signOut: vi.fn() })
    renderWithRouter()
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
  })
})

describe('AdminRoute — authenticated student', () => {
  it('redirects to /home when the user is not a teacher', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'student-1' } } as never,
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
    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })
})

describe('AdminRoute — authenticated teacher', () => {
  it('renders children for a teacher', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'teacher-1' } } as never,
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
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })
})
