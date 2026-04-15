import { type FormEvent, useState } from 'react'
import { signInWithEmail } from '@/lib/auth'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      await signInWithEmail(email)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg px-4">
      <div className="w-full max-w-sm rounded-lg bg-ga-card p-8 shadow-card">
        <h1 className="mb-2 text-2xl font-semibold text-ga-text">Sign in</h1>
        <p className="mb-6 text-sm text-ga-textMuted">
          Enter your school email and we'll send you a login link — no password needed.
        </p>

        {status === 'success' ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-ga-teal-from/10 p-4 text-sm font-medium text-ga-text"
          >
            Check your email for a login link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ga-text">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              placeholder="you@school.edu.au"
              className="mb-4 w-full rounded-md border border-ga-border bg-white px-3 py-2 text-sm text-ga-text placeholder:text-ga-textMuted focus-visible:border-ga-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/30 disabled:opacity-50"
            />

            {status === 'error' && (
              <p role="alert" className="mb-4 text-sm text-ga-danger">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || email.trim() === ''}
              className="w-full rounded-md bg-ga-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ga-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
