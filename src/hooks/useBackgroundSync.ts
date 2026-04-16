/**
 * useBackgroundSync — polls syncDirtyDrafts every 30 seconds while active.
 *
 * Wire into LessonShell. Pass active=false to pause (e.g. on review slide or
 * when the lesson is not in focus).
 */
import { useEffect } from 'react'
import { syncDirtyDrafts } from '@/lib/syncService'

const INTERVAL_MS = 30_000

export function useBackgroundSync(
  studentId: string | null,
  lessonId: string,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return

    const id = setInterval(() => {
      void syncDirtyDrafts(studentId, lessonId)
    }, INTERVAL_MS)

    return () => clearInterval(id)
  }, [studentId, lessonId, active])
}
