import { useEffect } from 'react'
import type { Dispatch } from 'react'
import { supabase } from '@/lib/supabase'
import type { LessonAction } from '@/contexts/lessonReducer'

const POLL_INTERVAL_MS = 10_000

export function useLockSubscription(
  lessonId: string,
  dispatch: Dispatch<LessonAction>,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled || !lessonId) return

    async function fetchLocks() {
      const { data } = await supabase
        .from('slide_locks')
        .select('slide_id, locked')
        .eq('lesson_id', lessonId)
      for (const row of data ?? []) {
        dispatch({ type: 'SET_LOCK', slideId: row.slide_id, locked: row.locked })
      }
    }

    void fetchLocks()

    let pollingInterval: ReturnType<typeof setInterval> | null = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`slide_locks:${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slide_locks',
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload: { new: { slide_id: string; locked: boolean } }) => {
          dispatch({
            type: 'SET_LOCK',
            slideId: payload.new.slide_id,
            locked: payload.new.locked,
          })
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!pollingInterval) {
            pollingInterval = setInterval(() => void fetchLocks(), POLL_INTERVAL_MS)
          }
        } else if (status === 'SUBSCRIBED') {
          if (pollingInterval) {
            clearInterval(pollingInterval)
            pollingInterval = null
          }
        }
      })

    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase as any).removeChannel(channel)
    }
  }, [lessonId, dispatch, enabled])
}
