import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    async function exchange() {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        setError(error.message)
      } else {
        navigate('/', { replace: true })
      }
    }

    exchange()
  }, [navigate])

  if (error) {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg px-4">
        <div className="w-full max-w-sm rounded-lg bg-ga-card p-8 shadow-card">
          <h1 className="mb-2 text-xl font-semibold text-ga-text">Sign-in failed</h1>
          <p className="mb-4 text-sm text-ga-danger">{error}</p>
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

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg">
      <p className="text-sm text-ga-textMuted">Signing you in…</p>
    </main>
  )
}
