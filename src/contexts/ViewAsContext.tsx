/* eslint-disable react-refresh/only-export-components -- context files export both a provider and a hook */
/**
 * ViewAsContext — lets a teacher preview the app as if they were a student.
 *
 * The real role stays in AuthContext.profile.role. This layer adds an optional
 * `viewAs` override, persisted in localStorage so the preview survives page
 * reloads until the teacher explicitly switches back.
 *
 * Consumers should read `effectiveRole` rather than `profile.role` when they
 * want behaviour to follow the override (nav rendering, home icon destination,
 * whether the preview banner shows, etc.). Route guards should keep reading
 * the real role so a teacher in student-view still has access to teacher
 * routes and can click "Back to teacher view" from anywhere.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useAuth, useOptionalAuth } from '@/contexts/AuthContext'

const STORAGE_KEY = 'viewAs'

type ViewAs = 'student' | null

interface ViewAsContextValue {
  viewAs: ViewAs
  setViewAs: (v: ViewAs) => void
  /** 'teacher' or 'student' after applying the viewAs override. */
  effectiveRole: 'teacher' | 'student'
  /** True only if the user is actually a teacher and currently in student-view. */
  isImpersonatingStudent: boolean
}

const ViewAsContext = createContext<ViewAsContextValue | null>(null)

function readInitial(): ViewAs {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'student' ? 'student' : null
  } catch {
    return null
  }
}

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [viewAs, setViewAsState] = useState<ViewAs>(readInitial)

  const setViewAs = (v: ViewAs) => {
    setViewAsState(v)
    try {
      if (v === null) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, v)
    } catch {
      // localStorage unavailable (e.g. private browsing). State still updates in memory.
    }
  }

  const actualRole = profile?.role
  const effectiveRole: 'teacher' | 'student' =
    actualRole === 'teacher' && viewAs !== 'student' ? 'teacher' : 'student'
  const isImpersonatingStudent = actualRole === 'teacher' && viewAs === 'student'

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs, effectiveRole, isImpersonatingStudent }}>
      {children}
    </ViewAsContext.Provider>
  )
}

/**
 * Returns the view-as state and helpers. Falls back gracefully when the
 * provider is absent (e.g. isolated component tests) by deriving effective
 * role from the actual auth profile and making `setViewAs` a no-op.
 */
export function useViewAs(): ViewAsContextValue {
  const ctx = useContext(ViewAsContext)
  const auth = useOptionalAuth()
  if (ctx) return ctx
  const actualRole = auth?.profile?.role
  const effectiveRole: 'teacher' | 'student' = actualRole === 'teacher' ? 'teacher' : 'student'
  return {
    viewAs: null,
    setViewAs: () => {},
    effectiveRole,
    isImpersonatingStudent: false,
  }
}
