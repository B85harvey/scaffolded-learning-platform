/* eslint-disable react-refresh/only-export-components -- context files export both a provider component and the useLesson hook; splitting further adds indirection without benefit */
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import { lessonReducer } from './lessonReducer'
import type { LessonState, LessonAction } from './lessonReducer'

// ── Context ──────────────────────────────────────────────────────────────────

interface LessonContextValue {
  state: LessonState
  dispatch: Dispatch<LessonAction>
}

const LessonContext = createContext<LessonContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

interface LessonProviderProps {
  initialState: LessonState
  children: ReactNode
}

export function LessonProvider({ initialState, children }: LessonProviderProps) {
  const [state, dispatch] = useReducer(lessonReducer, initialState)
  return <LessonContext.Provider value={{ state, dispatch }}>{children}</LessonContext.Provider>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLesson(): LessonContextValue {
  const ctx = useContext(LessonContext)
  if (!ctx) {
    throw new Error('useLesson must be used inside a LessonProvider')
  }
  return ctx
}
