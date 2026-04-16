import { Link } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Student home/dashboard page.
 * Lists available lessons and shows the student's name.
 * Shown at /home for authenticated students.
 */
export function Home() {
  const { profile, session } = useAuth()
  const displayName = profile?.display_name ?? session?.user.email ?? ''

  return (
    <>
      <SkipToContent />
      <AppNav />
      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 font-sans text-2xl font-semibold text-ga-text">
            Welcome back{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mb-8 text-sm text-ga-textMuted">
            Choose a lesson below to continue your work.
          </p>

          {/* Lesson card placeholder — unit assignments wired in a future slice */}
          <div className="rounded-lg bg-ga-card p-6 shadow-card">
            <h2 className="mb-1 font-sans text-base font-semibold text-ga-text">
              Kitchen Technologies
            </h2>
            <p className="mb-4 text-sm text-ga-textMuted">
              Food trends, decision-making, and practical food tech.
            </p>
            <Link
              to="/lesson/kitchen-technologies"
              className="inline-block rounded-md bg-ga-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ga-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
            >
              Open lesson
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
