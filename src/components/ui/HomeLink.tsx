/**
 * HomeLink — small home icon that routes to the current user's dashboard.
 *
 * Destination is decided by the effective role from ViewAsContext:
 * - teacher        → /teacher/lessons (the lesson library)
 * - student        → /home (the student dashboard)
 *
 * Rendered as a plain <a> rather than a react-router <Link> so it can be
 * dropped into any page without requiring a Router ancestor in isolated tests,
 * and so exiting a lesson performs a clean full-page navigation that resets
 * any in-memory state.
 */
import { Home } from 'lucide-react'
import { useViewAs } from '@/contexts/ViewAsContext'
import { cn } from '@/lib/utils'

interface HomeLinkProps {
  /** Extra classes merged after the defaults. */
  className?: string
  /** Icon size in px. Default 18. */
  size?: number
}

export function HomeLink({ className, size = 18 }: HomeLinkProps) {
  const { effectiveRole } = useViewAs()
  const href = effectiveRole === 'teacher' ? '/teacher/lessons' : '/home'

  return (
    <a
      href={href}
      aria-label="Go home"
      data-testid="home-link"
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-ga-sm text-ga-ink-muted transition-colors',
        'hover:bg-ga-surface-muted hover:text-ga-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70',
        className
      )}
    >
      <Home size={size} aria-hidden="true" />
    </a>
  )
}
