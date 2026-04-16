import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Renders children for authenticated teachers.
 * Unauthenticated users are sent to /auth/signin.
 * Authenticated non-teachers are sent to /home.
 * Shows a loading spinner while the auth state is being determined.
 */
export function AdminRoute({ children }: Props) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <main
        id="main"
        className="flex min-h-screen items-center justify-center bg-ga-bg"
        aria-label="Loading…"
        aria-busy="true"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ga-border border-t-ga-blue" />
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/auth/signin" replace />
  }

  if (profile?.role !== 'teacher') {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
