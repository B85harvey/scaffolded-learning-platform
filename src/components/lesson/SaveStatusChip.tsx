/**
 * SaveStatusChip — shows sync state in the lesson header.
 *
 * idle    → empty (no visible text)
 * saving  → spinner + "Saving..."
 * saved   → tick + "Saved" (auto-hides after 3 s back to idle)
 * error   → warning icon + "Connection lost" (persists until next success)
 *           tooltip: "Your work is saved locally. It will sync when the connection returns."
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { useSyncStatus } from '@/contexts/SyncStatusContext'

const SAVED_VISIBLE_MS = 3000

export function SaveStatusChip() {
  const status = useSyncStatus()
  // savedExpired flips true after SAVED_VISIBLE_MS; reset via effect cleanup (allowed by the rule)
  const [savedExpired, setSavedExpired] = useState(false)

  useEffect(() => {
    if (status !== 'saved') return
    const timer = setTimeout(() => setSavedExpired(true), SAVED_VISIBLE_MS)
    return () => {
      clearTimeout(timer)
      setSavedExpired(false)
    }
  }, [status])

  const savedVisible = status === 'saved' && !savedExpired

  // Shared wrapper — always present so aria-live region is stable
  const wrap = (children: React.ReactNode, label: string) => (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5"
      aria-label={label}
      data-testid="save-status-chip"
    >
      {children}
    </div>
  )

  if (status === 'saving') {
    return wrap(
      <>
        <Loader2 size={14} className="animate-spin text-ga-ink-muted" aria-hidden="true" />
        <span className="font-sans text-sm text-ga-ink-muted">Saving...</span>
      </>,
      'Saving...'
    )
  }

  if (status === 'saved' && savedVisible) {
    return wrap(
      <>
        <Check size={14} className="text-ga-green" aria-hidden="true" />
        <span className="font-sans text-sm text-ga-ink-muted">Saved</span>
      </>,
      'Saved'
    )
  }

  if (status === 'error') {
    return wrap(
      <>
        <AlertTriangle size={14} className="text-ga-warning" aria-hidden="true" />
        <span
          className="font-sans text-sm text-ga-warning"
          title="Your work is saved locally. It will sync when the connection returns."
        >
          Connection lost
        </span>
      </>,
      'Connection lost — your work is saved locally'
    )
  }

  // idle or saved-but-faded: render empty stable region
  return wrap(null, 'Save status')
}
