import type { SlideConfig, SlideAnswers, CommittedParagraph, Section } from '@/lessons/types'
import { assemble } from '@/lib/scaffold'
import type { Answer } from '@/lib/scaffold'

// ── State ────────────────────────────────────────────────────────────────────

export interface LessonState {
  lessonId: string
  currentSlideIndex: number
  slides: SlideConfig[]
  answers: Record<string, SlideAnswers>
  committed: Record<string, CommittedParagraph>
  /** Slide IDs that have been committed by the student (scaffold slides only). */
  committedSlideIds: string[]
  locks: Record<string, boolean>
  ui: {
    shortcutsOpen: boolean
    reviewTab: 'raw' | 'polished'
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type LessonAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO'; slideId: string }
  | { type: 'SET_TEXT_ANSWER'; slideId: string; promptId: string; value: string }
  | { type: 'SET_TABLE_ROW'; slideId: string; rowIndex: number; columnId: string; value: string }
  | { type: 'COMMIT'; slideId: string }
  | { type: 'UNCOMMIT'; slideId: string }
  | { type: 'TOGGLE_LOCK'; slideId: string }
  | { type: 'OPEN_SHORTCUTS' }
  | { type: 'CLOSE_SHORTCUTS' }
  | { type: 'SET_REVIEW_TAB'; tab: 'raw' | 'polished' }

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildAnswersForCommit(
  slide: SlideConfig,
  slideAnswers: SlideAnswers | undefined
): Answer[] {
  if (slide.type !== 'scaffold') return []

  if (slide.mode === 'freeform-table') {
    if (!slideAnswers || slideAnswers.kind !== 'table') return []
    return slideAnswers.rows.map((row) => ({ kind: 'table-row' as const, values: row }))
  }

  // framed or guided
  const textValues = slideAnswers && slideAnswers.kind === 'text' ? slideAnswers.values : {}
  return (slide.config.prompts ?? []).map((p) => ({
    kind: 'text' as const,
    promptId: p.id,
    value: textValues[p.id] ?? '',
  }))
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export function lessonReducer(state: LessonState, action: LessonAction): LessonState {
  switch (action.type) {
    case 'NEXT': {
      const next = state.currentSlideIndex + 1
      if (next >= state.slides.length) return state
      return { ...state, currentSlideIndex: next }
    }

    case 'BACK': {
      const prev = state.currentSlideIndex - 1
      if (prev < 0) return state
      return { ...state, currentSlideIndex: prev }
    }

    case 'GOTO': {
      const idx = state.slides.findIndex((s) => s.id === action.slideId)
      if (idx === -1) return state
      return { ...state, currentSlideIndex: idx }
    }

    case 'SET_TEXT_ANSWER': {
      const existing = state.answers[action.slideId]
      const values = existing && existing.kind === 'text' ? { ...existing.values } : {}
      values[action.promptId] = action.value
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.slideId]: { kind: 'text', values },
        },
      }
    }

    case 'SET_TABLE_ROW': {
      const existing = state.answers[action.slideId]
      const rows: Array<Record<string, string>> =
        existing && existing.kind === 'table' ? existing.rows.map((r) => ({ ...r })) : []
      while (rows.length <= action.rowIndex) {
        rows.push({})
      }
      rows[action.rowIndex] = { ...rows[action.rowIndex], [action.columnId]: action.value }
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.slideId]: { kind: 'table', rows },
        },
      }
    }

    case 'COMMIT': {
      const slide = state.slides.find((s) => s.id === action.slideId)
      if (!slide || slide.type !== 'scaffold') return state

      const slideAnswers = state.answers[action.slideId]
      const engineAnswers = buildAnswersForCommit(slide, slideAnswers)
      const result = assemble(slide.config, engineAnswers)

      const section = slide.section as Section
      const committed: CommittedParagraph = {
        section,
        text: result.paragraph,
        warnings: result.warnings.map((w) => w.message),
        committedAt: Date.now(),
      }

      const alreadyCommitted = state.committedSlideIds.includes(action.slideId)

      return {
        ...state,
        committed: {
          ...state.committed,
          [section]: committed,
        },
        committedSlideIds: alreadyCommitted
          ? state.committedSlideIds
          : [...state.committedSlideIds, action.slideId],
      }
    }

    case 'UNCOMMIT': {
      const slide = state.slides.find((s) => s.id === action.slideId)
      if (!slide || slide.type !== 'scaffold') return state

      const section = slide.section as string
      const nextCommitted = { ...state.committed }
      delete nextCommitted[section]

      return {
        ...state,
        committed: nextCommitted,
        committedSlideIds: state.committedSlideIds.filter((id) => id !== action.slideId),
      }
    }

    case 'TOGGLE_LOCK': {
      return {
        ...state,
        locks: {
          ...state.locks,
          [action.slideId]: !state.locks[action.slideId],
        },
      }
    }

    case 'OPEN_SHORTCUTS': {
      return { ...state, ui: { ...state.ui, shortcutsOpen: true } }
    }

    case 'CLOSE_SHORTCUTS': {
      return { ...state, ui: { ...state.ui, shortcutsOpen: false } }
    }

    case 'SET_REVIEW_TAB': {
      return { ...state, ui: { ...state.ui, reviewTab: action.tab } }
    }

    default: {
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function makeLessonState(lessonId: string, slides: SlideConfig[]): LessonState {
  return {
    lessonId,
    currentSlideIndex: 0,
    slides,
    answers: {},
    committed: {},
    committedSlideIds: [],
    locks: {},
    ui: { shortcutsOpen: false, reviewTab: 'raw' },
  }
}
