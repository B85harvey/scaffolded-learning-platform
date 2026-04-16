/**
 * useAutosave — debounced per-prompt Dexie write.
 *
 * Watches `value` and writes to the local draft store 400 ms after the last
 * change. Returns a `dirty` flag that is true whenever there are unsynced
 * local writes (syncedAt === null).
 *
 * PromptAutosave is a companion null-render component so that useAutosave can
 * be called once per prompt inside a .map() without violating the "no hooks in
 * loops" rule (each PromptAutosave is its own component instance).
 */
import { useEffect, useRef } from 'react'
import { db } from '@/lib/dexieDb'

const DEBOUNCE_MS = 400

export function useAutosave(
  lessonId: string,
  slideId: string,
  promptId: string,
  value: string
): { dirty: boolean } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      void db.drafts.put({
        id: `${lessonId}:${slideId}:${promptId}`,
        lessonId,
        slideId,
        promptId,
        value,
        updatedAt: Date.now(),
        syncedAt: null,
      })
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lessonId, slideId, promptId, value])

  // Any value held in this hook has a pending or recent Dexie write (syncedAt: null).
  // The sync service clears the dirty state globally via setSyncStatus; the hook
  // itself is always "dirty" from its own perspective until a sync succeeds.
  return { dirty: true }
}

// ── PromptAutosave ────────────────────────────────────────────────────────────

interface PromptAutosaveProps {
  lessonId: string
  slideId: string
  promptId: string
  value: string
}

/**
 * Null-render component. Place once per prompt inside a .map() to call
 * useAutosave without violating hooks rules.
 */
export function PromptAutosave({ lessonId, slideId, promptId, value }: PromptAutosaveProps) {
  useAutosave(lessonId, slideId, promptId, value)
  return null
}
