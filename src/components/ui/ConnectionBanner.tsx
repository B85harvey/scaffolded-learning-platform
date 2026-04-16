/**
 * ConnectionBanner — slim offline indicator shown at the top of every page.
 *
 * Listens to navigator.onLine and the browser's 'online'/'offline' events.
 * The dismiss button clears the banner for the current offline period only;
 * if the connection drops again after coming back online, the banner reappears.
 */
import { useEffect, useState } from 'react'

export function ConnectionBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      setDismissed(false)
    }

    function handleOffline() {
      setIsOffline(true)
      setDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline || dismissed) return null

  return (
    <div
      role="alert"
      data-testid="connection-banner"
      className="flex items-center justify-between bg-ga-warning px-4 py-2 text-sm font-medium text-ga-text"
    >
      <span>
        You&apos;re offline. Your work is saved locally and will sync when the connection returns.
      </span>
      <button
        type="button"
        aria-label="Dismiss offline banner"
        data-testid="connection-banner-dismiss"
        onClick={() => setDismissed(true)}
        className="ml-4 shrink-0 rounded px-2 py-0.5 text-xs font-semibold hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-text/50 focus-visible:ring-offset-1"
      >
        Dismiss
      </button>
    </div>
  )
}
