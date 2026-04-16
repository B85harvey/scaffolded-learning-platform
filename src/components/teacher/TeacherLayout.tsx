/**
 * TeacherLayout — wrapper for all /teacher/* routes.
 *
 * Applies AdminRoute protection (teacher-only) and renders TeacherNav above
 * the page content. Pages rendered inside this layout do not need their own
 * AdminRoute guard.
 */
import type { ReactNode } from 'react'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { TeacherNav } from '@/components/teacher/TeacherNav'

interface Props {
  children: ReactNode
}

export function TeacherLayout({ children }: Props) {
  return (
    <AdminRoute>
      <div className="flex min-h-screen flex-col bg-ga-surface-muted">
        <TeacherNav />
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </AdminRoute>
  )
}
