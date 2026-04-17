/**
 * TeacherLayout tests.
 *
 * Verifies that TeacherLayout renders TeacherNav + children for teachers,
 * and redirects non-teachers (inheriting AdminRoute behaviour).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TeacherLayout } from './TeacherLayout'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const TEACHER_AUTH = {
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

function renderLayout(initialPath = '/teacher/lessons') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/teacher/lessons"
          element={
            <TeacherLayout>
              <div>Lessons content</div>
            </TeacherLayout>
          }
        />
        <Route path="/auth/signin" element={<div>Sign in page</div>} />
        <Route path="/home" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TeacherLayout — teacher user', () => {
  it('renders TeacherNav with expected links', () => {
    mockUseAuth.mockReturnValue(TEACHER_AUTH)
    renderLayout()

    expect(screen.getByRole('navigation', { name: 'Teacher navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Lessons' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Live Wall' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Class' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Units' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Groups' })).toBeInTheDocument()
  })

  it('renders children inside main', () => {
    mockUseAuth.mockReturnValue(TEACHER_AUTH)
    renderLayout()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Lessons content')).toBeInTheDocument()
  })
})

describe('TeacherLayout — non-teacher user', () => {
  it('redirects to /home for a student', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'student-1' } } as never,
      profile: {
        id: 'student-1',
        email: 'student@school.edu.au',
        role: 'student' as const,
        display_name: null,
        created_at: '',
        updated_at: '',
      },
      loading: false,
      signOut: vi.fn(),
    })
    renderLayout()
    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(screen.queryByText('Lessons content')).not.toBeInTheDocument()
  })

  it('redirects to /auth/signin when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ session: null, profile: null, loading: false, signOut: vi.fn() })
    renderLayout()
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
  })
})
