import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Fetches the scribe label for a lesson group.
 *
 * Returns one of:
 *   - "No group assigned"  — when no group exists for this student + lesson
 *   - "You are the scribe" — when the current student is the scribe
 *   - "Scribe: <name>"     — when another student is the scribe
 */
export function useScribeLabel(lessonId: string, studentId: string | null): string {
  const [scribeLabel, setScribeLabel] = useState('No group assigned')

  useEffect(() => {
    if (!studentId || !lessonId) return

    async function fetchScribe() {
      try {
        // Step 1: find groups for this lesson.
        const { data: groups } = await supabase
          .from('groups')
          .select('id')
          .eq('lesson_id', lessonId)

        const groupIds = (groups ?? []).map((g) => g.id).filter(Boolean) as string[]
        if (groupIds.length === 0) return // leave 'No group assigned'

        // Step 2: find which group the student belongs to.
        const { data: myMembership } = await supabase
          .from('group_members')
          .select('group_id, is_scribe')
          .eq('student_id', studentId as string)
          .in('group_id', groupIds)
          .maybeSingle()

        if (!myMembership) return

        if (myMembership.is_scribe) {
          setScribeLabel('You are the scribe')
          return
        }

        // Step 3: find the scribe of the group.
        const { data: scribeMember } = await supabase
          .from('group_members')
          .select('student_id')
          .eq('group_id', myMembership.group_id!)
          .eq('is_scribe', true)
          .maybeSingle()

        if (!scribeMember?.student_id) return

        // Step 4: resolve the scribe's display name.
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', scribeMember.student_id)
          .maybeSingle()

        const name = profile?.display_name ?? profile?.email ?? 'Unknown'
        setScribeLabel(`Scribe: ${name}`)
      } catch {
        // Silently keep 'No group assigned' on any error.
      }
    }

    void fetchScribe()
  }, [lessonId, studentId])

  return scribeLabel
}
