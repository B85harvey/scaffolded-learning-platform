import { useParams } from 'react-router-dom'
import { getLessonById } from '@/lessons'
import { LessonShell } from '@/components/lesson/LessonShell'

export function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const lesson = id ? getLessonById(id) : undefined

  if (!lesson) {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-ga-bg">
        <div className="rounded-lg bg-ga-card p-10 shadow-card">
          <h1 className="font-sans text-2xl font-semibold text-ga-text">Lesson not found</h1>
          <p className="mt-2 text-ga-textMuted">
            No lesson with the id <code className="font-mono text-sm">{id}</code> exists.
          </p>
        </div>
      </main>
    )
  }

  return <LessonShell lesson={lesson} />
}
