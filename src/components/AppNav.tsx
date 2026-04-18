import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { HomeLink } from '@/components/ui/HomeLink'
import { useAuth } from '@/contexts/AuthContext'
import { useViewAs } from '@/contexts/ViewAsContext'

/**
 * Minimal top navigation bar.
 * - Teachers see admin links (Class, Units, Groups).
 * - Students see their name and a Home link.
 * A teacher in student-view sees the student nav so the preview feels real.
 * Both views include a Sign out button.
 */
export function AppNav() {
  const { profile, session, signOut } = useAuth()
  const { effectiveRole } = useViewAs()

  const isTeacher = effectiveRole === 'teacher'
  const displayName = profile?.display_name ?? session?.user.email ?? ''

  function handleSignOut() {
    void signOut()
  }

  return (
    <nav
      aria-label="Main navigation"
      className="flex h-12 items-center border-b border-ga-border bg-ga-card px-6"
    >
      {isTeacher ? (
        <div className="flex flex-1 items-center gap-6">
          <HomeLink />
          <Link
            to="/admin/class"
            className="rounded-sm text-sm font-medium text-ga-text hover:text-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
          >
            Class
          </Link>
          <Link
            to="/admin/units"
            className="rounded-sm text-sm font-medium text-ga-text hover:text-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
          >
            Units
          </Link>
          <Link
            to="/admin/groups"
            className="rounded-sm text-sm font-medium text-ga-text hover:text-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
          >
            Groups
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-6">
          <HomeLink />
          <span className="text-sm font-medium text-ga-text">{displayName}</span>
          <Link
            to="/home"
            className="rounded-sm text-sm font-medium text-ga-text hover:text-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
          >
            Home
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ga-textMuted transition-colors hover:text-ga-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
      >
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    </nav>
  )
}
