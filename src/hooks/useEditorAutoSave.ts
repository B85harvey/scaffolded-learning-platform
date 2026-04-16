/**
 * useEditorAutoSave — debounced auto-save for the lesson editor.
 *
 * On each config change (detected by JSON serialisation), waits `delayMs`
 * (default 1 000 ms) then upserts the slide's config and updated_at.
 * Also bumps lessons.updated_at on every successful save.
 *
 * Returns a SaveStatus the editor header can display.
 *
 * Design notes:
 * - All setState calls live inside setTimeout / Promise callbacks (async), so
 *   the react-hooks/set-state-in-effect rule is satisfied.
 * - Slide switches are detected via a ref so they don't trigger a spurious save.
 * - An `active` flag prevents setState on an unmounted component.
 */
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/supabase'

export type EditorSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Options {
  lessonId: string
  slideId: string
  /** The full slide config object. Compared by JSON serialisation. */
  config: unknown
  delayMs?: number
}

export function useEditorAutoSave({
  lessonId,
  slideId,
  config,
  delayMs = 1_000,
}: Options): EditorSaveStatus {
  const [status, setStatus] = useState<EditorSaveStatus>('idle')
  const prevSlideId = useRef<string>(slideId)
  const hasMounted = useRef(false)

  // Stringify for value-equality comparison as a dependency.
  const serialized = JSON.stringify(config)

  useEffect(() => {
    // Detect slide switches so we don't save the new slide's initial config.
    const isSlideSwitch = prevSlideId.current !== slideId
    prevSlideId.current = slideId

    // Skip the initial mount and any slide-switch renders.
    if (!hasMounted.current || isSlideSwitch) {
      hasMounted.current = true
      return
    }

    if (!slideId || !lessonId) return

    let active = true
    // Capture config at the time the effect runs (not at timer-fire time).
    const capturedConfig = config

    const timer = setTimeout(() => {
      // Inside async callback — setState allowed by react-hooks/set-state-in-effect.
      setStatus('saving')

      const now = new Date().toISOString()

      // Wrap in Promise.resolve so we get a native Promise with .catch()
      Promise.resolve(
        supabase
          .from('slides')
          .update({ config: capturedConfig as Json, updated_at: now })
          .eq('id', slideId)
      )
        .then(({ error: slideErr }) => {
          if (!active) return
          if (slideErr) {
            setStatus('error')
            return
          }
          return Promise.resolve(
            supabase.from('lessons').update({ updated_at: now }).eq('id', lessonId)
          ).then(() => {
            if (active) setStatus('saved')
          })
        })
        .catch(() => {
          if (active) setStatus('error')
        })
    }, delayMs)

    return () => {
      active = false
      clearTimeout(timer)
    }
    // config is intentionally omitted — serialized covers value changes.
    // lessonId and delayMs are stable for the lifetime of the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, slideId, serialized])

  return status
}
