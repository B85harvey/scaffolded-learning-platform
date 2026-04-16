import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export const WELCOME_SEEN_KEY = 'welcome_seen'

/**
 * First-time student welcome screen.
 * Shown once after the student's first magic-link sign-in.
 * "Get started" and "Skip" both set a localStorage flag so the screen is
 * never shown again.
 */
export function WelcomeScreen() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [className, setClassName] = useState<string>('')

  useEffect(() => {
    if (!session?.user.id) return

    async function fetchClassName() {
      // Fetch the class_id for this student, then get the class name.
      const { data: membership } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', session!.user.id)
        .maybeSingle()

      if (!membership?.class_id) return

      const { data: classRow } = await supabase
        .from('classes')
        .select('name')
        .eq('id', membership.class_id)
        .maybeSingle()

      if (classRow?.name) setClassName(classRow.name)
    }

    void fetchClassName()
  }, [session])

  function markSeen() {
    localStorage.setItem(WELCOME_SEEN_KEY, '1')
  }

  function handleGetStarted() {
    markSeen()
    navigate('/home')
  }

  function handleSkip() {
    markSeen()
    navigate('/home')
  }

  const displayName = profile?.display_name ?? session?.user.email ?? ''
  const heading = `Welcome to ${className || 'your class'}, ${displayName}!`

  return (
    <main
      id="main"
      className="relative flex min-h-screen items-center justify-center bg-ga-bg px-4"
    >
      {/* Skip button — top-right corner */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-6 top-6 rounded-sm text-sm text-ga-textMuted underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
      >
        Skip
      </button>

      <div className="w-full max-w-lg rounded-lg bg-ga-card p-10 shadow-card">
        <h1 className="mb-4 font-sans text-2xl font-semibold text-ga-text">{heading}</h1>

        <p className="mb-8 text-sm leading-relaxed text-ga-textMuted">
          Your teacher has set up lessons for you. You'll work through content slides, answer
          questions, and build a written response section by section. Your work saves automatically
          as you go — you can close the browser and pick up right where you left off.
        </p>

        <button
          type="button"
          onClick={handleGetStarted}
          className="w-full rounded-md bg-ga-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ga-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
        >
          Get started
        </button>
      </div>
    </main>
  )
}
