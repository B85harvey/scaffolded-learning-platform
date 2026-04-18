/**
 * TeacherNav — unified navigation bar for all teacher-facing pages.
 *
 * Shows the lesson library and class-management routes. Dashboard and Live
 * Wall are per-lesson views and are reached from the lesson library row
 * actions, not from the global nav.
 */
import { Link } from 'react-router-dom'
import { Eye, LogOut } from 'lucide-react'
import { HomeLink } from '@/components/ui/HomeLink'
import { useAuth } from '@/contexts/AuthContext'
import { useViewAs } from '@/contexts/ViewAsContext'

export function TeacherNav() {
  const { signOut } = useAuth()
  const { setViewAs } = useViewAs()

  function handleViewAsStudent() {
    setViewAs('student')
    // Full-page navigation so any role-derived UI state picks up the flag.
    window.location.href = '/home'
  }

  return (
    <nav
      aria-label="Teacher navigation"
      className="flex h-12 items-center border-b border-ga-border bg-ga-card px-6"
    >
      <div className="flex flex-1 items-center gap-6">
        <HomeLink />
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
        onClick={handleViewAsStudent}
        aria-label="View the app as a student"
        data-testid="view-as-student-btn"
        className="mr-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ga-textMuted transition-colors hover:text-ga-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
      >
        <Eye size={15} aria-hidden="true" />
        View as student
      </button>
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
