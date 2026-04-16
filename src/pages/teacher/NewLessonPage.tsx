/**
 * NewLessonPage — creates a new lesson row and redirects to its editor.
 *
 * Rendered at /teacher/lessons/new. Shows a loading spinner while the
 * Supabase insert is in flight, then navigates to the editor.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherLayout } from '@/components/teacher/TeacherLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function NewLessonPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const slug = `untitled-${crypto.randomUUID().slice(0, 8)}`

    supabase
      .from('lessons')
      .insert({
        slug,
        title: 'Untitled Lesson',
        created_by: session?.user.id ?? null,
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setCreateError(error?.message ?? 'Could not create lesson')
          return
        }
        navigate(`/teacher/lessons/${data.id}/edit`, { replace: true })
      })

    return () => {
      active = false
    }
  }, [navigate, session])

  return (
    <TeacherLayout>
      <div
        data-testid="new-lesson-loading"
        className="flex h-[calc(100vh-3rem)] items-center justify-center"
      >
        {createError ? (
          <p className="font-sans text-sm text-ga-danger" role="alert">
            {createError}
          </p>
        ) : (
          <div
            aria-label="Creating lesson…"
            aria-busy="true"
            className="h-8 w-8 animate-spin rounded-full border-4 border-ga-border-subtle border-t-ga-primary"
          />
        )}
      </div>
    </TeacherLayout>
  )
}
