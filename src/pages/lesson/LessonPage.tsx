import { useParams } from 'react-router-dom'
import { getLessonById } from '@/lessons'
import { LessonShell } from '@/components/lesson/LessonShell'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { useAuth } from '@/contexts/AuthContext'

export function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const lesson = id ? getLessonById(id) : undefined
  const studentId = session?.user.id ?? null

  if (!lesson) {
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
      <LessonShell lesson={lesson} studentId={studentId} />
    </LessonProvider>
  )
}
