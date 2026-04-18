/**
 * StudentViewBanner — shows when a teacher is previewing the app as a student.
 *
 * Renders nothing unless the user is actually a teacher AND has the view-as
 * flag set to 'student'. Sits at the very top of the app, above all nav,
 * with a "Back to teacher view" button that clears the flag and navigates
 * back to the teacher lesson library.
 */
import { Eye } from 'lucide-react'
import { useViewAs } from '@/contexts/ViewAsContext'

export function StudentViewBanner() {
  const { isImpersonatingStudent, setViewAs } = useViewAs()

  if (!isImpersonatingStudent) return null

  function handleBack() {
    setViewAs(null)
    // Full-page navigation so any in-memory role-derived state resets cleanly.
    window.location.href = '/teacher/lessons'
  }

  return (
    <div
      role="status"
      data-testid="student-view-banner"
      className="flex h-10 items-center justify-center gap-3 border-b border-ga-amber/30 bg-ga-amber/10 px-4 font-sans text-sm text-ga-ink"
    >
      <Eye size={14} aria-hidden="true" className="text-ga-amber-solid" />
      <span>You are viewing as a student.</span>
      <button
        type="button"
        onClick={handleBack}
        data-testid="back-to-teacher-btn"
        className="rounded-ga-sm px-2 py-0.5 font-medium text-ga-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70"
      >
        Back to teacher view
      </button>
    </div>
  )
}
