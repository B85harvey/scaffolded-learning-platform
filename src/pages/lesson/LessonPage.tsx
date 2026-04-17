import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LessonShell } from '@/components/lesson/LessonShell'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { useAuth } from '@/contexts/AuthContext'
import { loadLesson } from '@/lib/lessonLoader'
import type { LessonConfig } from '@/lessons/types'

export function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const { session, profile } = useAuth()
  const studentId = session?.user.id ?? null
  const studentName = profile?.display_name ?? 'Student'

  // Initialise from URL param so the effect never calls setState synchronously.
  // When id is missing we show the error state immediately without an effect.
  const [lesson, setLesson] = useState<LessonConfig | null>(null)
  const [lessonLoading, setLessonLoading] = useState(() => Boolean(id))
  const [loadError, setLoadError] = useState(() => !id)

  useEffect(() => {
    if (!id) return

    // All setState calls happen inside async Promise callbacks, satisfying the
    // react-hooks/set-state-in-effect rule (no synchronous setState in effects).
    loadLesson(id)
      .then((loaded) => {
        setLesson(loaded)
      })
      .catch(() => {
        setLoadError(true)
      })
      .finally(() => {
        setLessonLoading(false)
      })
  }, [id])

  if (lessonLoading) {
    return (
      <div
        data-testid="lesson-page-skeleton"
        aria-label="Loading lesson…"
        aria-busy="true"
        className="flex min-h-screen flex-col bg-ga-surface-muted"
      >
        <div className="h-[88px] animate-pulse border-b border-ga-border-subtle bg-ga-surface" />
        <div className="flex flex-1 p-8">
          <div className="mx-auto w-full max-w-[820px] space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded-ga-md bg-ga-surface" />
            <div className="h-4 w-full animate-pulse rounded-ga-md bg-ga-surface" />
            <div className="h-4 w-5/6 animate-pulse rounded-ga-md bg-ga-surface" />
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !lesson) {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-ga-surface-muted">
        <div className="rounded-ga-md bg-ga-surface p-10 shadow-ga-md">
          <h1 className="font-sans text-2xl font-semibold text-ga-ink">Lesson not found</h1>
          <p className="mt-2 font-sans text-sm text-ga-ink-muted">
            No lesson with the id <code className="font-mono text-sm">{id}</code> exists.
          </p>
        </div>
      </main>
    )
  }

  return (
    <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
      <LessonShell lesson={lesson} studentId={studentId} studentName={studentName} />
    </LessonProvider>
  )
}
