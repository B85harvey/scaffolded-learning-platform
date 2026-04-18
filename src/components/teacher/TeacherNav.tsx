/**
 * TeacherNav — unified navigation bar for all teacher-facing pages.
 *
 * Shows the lesson library and class-management routes. Dashboard and Live
 * Wall are per-lesson views and are reached from the lesson library row
 * actions, not from the global nav.
 */
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function TeacherNav() {
  const { signOut } = useAuth()

  return (
    <nav
      aria-label="Teacher navigation"
      className="flex h-12 items-center border-b border-ga-border bg-ga-card px-6"
    >
      <div className="flex flex-1 items-center gap-6">
        <Link
          to="/teacher/lessons"
          className="rounded-sm text-sm font-medium text-ga-text hover:text-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
        >
          My Lessons
        </Link>
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

      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="Sign out"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ga-textMuted transition-colors hover:text-ga-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
      >
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    </nav>
  )
}
