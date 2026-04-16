/**
 * Module-level sync status bus.
 *
 * Uses the same event-bus pattern as Toast: no React context overhead, callable
 * from non-component code (syncService.ts) and from React (useSyncStatus).
 *
 * States:
 *   idle    — no recent activity (or chip hidden after 3 s)
 *   saving  — Supabase write in flight
 *   saved   — write succeeded
 *   error   — write failed; local data safe in Dexie
 */
import { useEffect, useState } from 'react'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error'

let _current: SyncStatus = 'idle'
const _listeners = new Set<(s: SyncStatus) => void>()

/** Call from sync service functions to broadcast status changes. */
export function setSyncStatus(status: SyncStatus): void {
  _current = status
  _listeners.forEach((l) => l(status))
}

/** React hook — subscribes to the module-level bus. */
export function useSyncStatus(): SyncStatus {
  // Initialise from the current bus value. If _current changes between render
  // and the effect (extremely unlikely for a status indicator), the listener
  // subscription will catch subsequent changes.
  const [status, setStatus] = useState<SyncStatus>(_current)

  useEffect(() => {
    _listeners.add(setStatus)
    return () => {
      _listeners.delete(setStatus)
    }
  }, [])

  return status
}
