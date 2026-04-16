import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Minimal top navigation bar.
 * - Teachers see admin links (Class, Units, Groups).
 * - Students see their name and a Home link.
 * Both views include a Sign out button.
 */
export function AppNav() {
  const { profile, session, signOut } = useAuth()

  const isTeacher = profile?.role === 'teacher'
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
          <Link to="/admin/class" className="text-sm font-medium text-ga-text hover:text-ga-blue">
            Class
          </Link>
          <Link to="/admin/units" className="text-sm font-medium text-ga-text hover:text-ga-blue">
            Units
          </Link>
          <Link to="/admin/groups" className="text-sm font-medium text-ga-text hover:text-ga-blue">
            Groups
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-6">
          <span className="text-sm font-medium text-ga-text">{displayName}</span>
          <Link to="/home" className="text-sm font-medium text-ga-text hover:text-ga-blue">
            Home
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ga-textMuted transition-colors hover:text-ga-danger"
      >
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    </nav>
  )
}
