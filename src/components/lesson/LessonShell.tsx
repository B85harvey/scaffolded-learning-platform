import type { LessonConfig } from '@/lessons/types'

interface LessonShellProps {
  lesson: LessonConfig
}

export function LessonShell({ lesson }: LessonShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-ga-bg">
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-ga-border bg-ga-card px-6 shadow-card">
        <h1 className="font-sans text-lg font-semibold text-ga-text">{lesson.title}</h1>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center p-10">
        <p className="text-ga-textMuted">Lesson shell — Phase 2 in progress.</p>
      </main>
    </div>
  )
}
