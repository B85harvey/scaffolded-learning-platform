import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { WELCOME_SEEN_KEY } from '@/pages/WelcomeScreen'

type CallbackStatus = 'exchanging' | 'checking' | 'not_enrolled' | 'error'

export function Callback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>('exchanging')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function run() {
      // Step 1: exchange the magic-link code for a session.
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )

      if (sessionError) {
        setErrorMessage(sessionError.message)
        setStatus('error')
        return
      }

      const userId = sessionData.session?.user.id
      if (!userId) {
        setErrorMessage('Session not established.')
        setStatus('error')
        return
      }

      setStatus('checking')

      // Step 2: look up the user's profile to determine their role.
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      // Teachers go straight to the admin class page.
      if (profileData?.role === 'teacher') {
        navigate('/admin/class', { replace: true })
        return
      }

      // Step 3: check class enrolment.
      const { data: memberData } = await supabase
        .from('class_members')
        .select('id')
        .eq('student_id', userId)
        .maybeSingle()

      if (!memberData) {
        setStatus('not_enrolled')
        return
      }

      // Step 4: check for any existing lesson progress.
      const { data: progressRows } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('student_id', userId)

      const hasProgress = (progressRows?.length ?? 0) > 0
      const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY) === '1'

      if (hasProgress || hasSeenWelcome) {
        navigate('/home', { replace: true })
      } else {
        navigate('/welcome', { replace: true })
      }
    }

    void run()
  }, [navigate])

  // ── Not enrolled ─────────────────────────────────────────────────────────
  if (status === 'not_enrolled') {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg px-4">
        <div className="w-full max-w-sm rounded-lg bg-ga-card p-8 shadow-card">
          <h1 className="mb-2 text-xl font-semibold text-ga-text">Not enrolled</h1>
          <p className="text-sm text-ga-textMuted">
            You're not enrolled in any class yet. Contact your teacher to receive an invitation.
          </p>
        </div>
      </main>
    )
  }

  // ── Auth error ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg px-4">
        <div className="w-full max-w-sm rounded-lg bg-ga-card p-8 shadow-card">
          <h1 className="mb-2 text-xl font-semibold text-ga-text">Sign-in failed</h1>
          <p className="mb-4 text-sm text-ga-danger">{errorMessage}</p>
          <a
            href="/auth/signin"
            className="text-sm font-medium text-ga-blue underline-offset-2 hover:underline"
          >
            Try again
          </a>
        </div>
      </main>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg">
      <p className="text-sm text-ga-textMuted">
        {status === 'exchanging' ? 'Signing you in…' : 'Checking your enrolment…'}
      </p>
    </main>
  )
}
