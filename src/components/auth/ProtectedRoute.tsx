import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Renders children for authenticated users.
 * Redirects unauthenticated users to /auth/signin.
 * Shows a loading spinner while the auth state is being determined.
 */
export function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth()

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

  return <>{children}</>
}
