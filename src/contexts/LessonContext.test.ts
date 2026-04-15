import { describe, it, expect } from 'vitest'
import { lessonReducer, makeLessonState } from './lessonReducer'
import type { LessonState } from './lessonReducer'
import type { SlideConfig } from '@/lessons/types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const contentSlide: SlideConfig = {
  id: 'slide-01',
  type: 'content',
  section: 'orientation',
  body: 'Welcome.',
}

const mcqSlide: SlideConfig = {
  id: 'slide-02',
  type: 'mcq',
  section: 'orientation',
  variant: 'self',
  question: 'Which option is correct?',
  options: [
    { id: 'a', text: 'Option A', correct: false },
    { id: 'b', text: 'Option B', correct: true },
  ],
}

const framedScaffoldSlide: SlideConfig = {
  id: 'slide-03',
  type: 'scaffold',
  section: 'aim',
  mode: 'framed',
  config: {
    id: 'aim',
    targetQuestion: 'Write the Aim.',
    mode: 'framed',
    sectionHeading: 'Aim',
    prompts: [
      {
        id: 'aim-dish',
        text: 'What dish will you produce?',
        frame: 'The aim is to produce {answer}',
      },
      {
        id: 'aim-tech',
        text: 'Which technology?',
        frame: 'using the {answer}.',
      },
    ],
  },
}

const guidedScaffoldSlide: SlideConfig = {
  id: 'slide-04',
  type: 'scaffold',
  section: 'decision',
  mode: 'guided',
  config: {
    id: 'decision',
    targetQuestion: 'Write the Decision.',
    mode: 'guided',
    sectionHeading: 'Decision',
    prompts: [
      {
        id: 'decision-sentence',
        text: 'State the Decision in one sentence.',
        maxWords: 60,
      },
    ],
  },
}

const freeformSlide: SlideConfig = {
  id: 'slide-05',
  type: 'scaffold',
  section: 'implementation',
  mode: 'freeform-table',
  config: {
    id: 'implementation',
    targetQuestion: 'Build the table.',
    mode: 'freeform-table',
    sectionHeading: 'Implementation',
    template: {
      columns: [
        { id: 'when', label: 'When' },
        { id: 'what', label: 'What' },
        { id: 'why', label: 'Why' },
      ],
      minRows: 2,
      rowLabels: ['Week 6', 'Week 7'],
    },
  },
}

const reviewSlide: SlideConfig = {
  id: 'slide-06',
  type: 'review',
  section: 'review',
}

const allSlides: SlideConfig[] = [
  contentSlide,
  mcqSlide,
  framedScaffoldSlide,
  guidedScaffoldSlide,
  freeformSlide,
  reviewSlide,
]

function makeState(overrides: Partial<LessonState> = {}): LessonState {
  return { ...makeLessonState('test-lesson', allSlides), ...overrides }
}

// ── NEXT ─────────────────────────────────────────────────────────────────────

describe('NEXT', () => {
  it('increments the slide index', () => {
    const state = makeState({ currentSlideIndex: 0 })
    const next = lessonReducer(state, { type: 'NEXT' })
    expect(next.currentSlideIndex).toBe(1)
  })

  it('does not advance past the last slide', () => {
    const state = makeState({ currentSlideIndex: allSlides.length - 1 })
    const next = lessonReducer(state, { type: 'NEXT' })
    expect(next.currentSlideIndex).toBe(allSlides.length - 1)
  })

  it('does not mutate other state', () => {
    const state = makeState({ currentSlideIndex: 2 })
    const next = lessonReducer(state, { type: 'NEXT' })
    expect(next.lessonId).toBe(state.lessonId)
    expect(next.committed).toBe(state.committed)
  })
})

// ── BACK ─────────────────────────────────────────────────────────────────────

describe('BACK', () => {
  it('decrements the slide index', () => {
    const state = makeState({ currentSlideIndex: 3 })
    const next = lessonReducer(state, { type: 'BACK' })
    expect(next.currentSlideIndex).toBe(2)
  })

  it('does not go below zero', () => {
    const state = makeState({ currentSlideIndex: 0 })
    const next = lessonReducer(state, { type: 'BACK' })
    expect(next.currentSlideIndex).toBe(0)
  })
})

// ── GOTO ─────────────────────────────────────────────────────────────────────

describe('GOTO', () => {
  it('jumps to the slide with the given id', () => {
    const state = makeState({ currentSlideIndex: 0 })
    const next = lessonReducer(state, { type: 'GOTO', slideId: 'slide-04' })
    expect(next.currentSlideIndex).toBe(3)
  })

  it('stays put when the slide id is unknown', () => {
    const state = makeState({ currentSlideIndex: 1 })
    const next = lessonReducer(state, { type: 'GOTO', slideId: 'does-not-exist' })
    expect(next.currentSlideIndex).toBe(1)
  })
})

// ── SET_TEXT_ANSWER ───────────────────────────────────────────────────────────

describe('SET_TEXT_ANSWER', () => {
  it('stores a text answer keyed by promptId', () => {
    const state = makeState()
    const next = lessonReducer(state, {
      type: 'SET_TEXT_ANSWER',
      slideId: 'slide-03',
      promptId: 'aim-dish',
      value: 'French toast',
    })
    const answers = next.answers['slide-03']
    expect(answers?.kind).toBe('text')
    if (answers?.kind === 'text') {
      expect(answers.values['aim-dish']).toBe('French toast')
    }
  })

  it('preserves existing answers for other prompts', () => {
    const state = makeState({
      answers: {
        'slide-03': { kind: 'text', values: { 'aim-dish': 'existing' } },
      },
    })
    const next = lessonReducer(state, {
      type: 'SET_TEXT_ANSWER',
      slideId: 'slide-03',
      promptId: 'aim-tech',
      value: 'Thermomix',
    })
    const answers = next.answers['slide-03']
    if (answers?.kind === 'text') {
      expect(answers.values['aim-dish']).toBe('existing')
      expect(answers.values['aim-tech']).toBe('Thermomix')
    }
  })

  it('overwrites an existing answer for the same promptId', () => {
    const state = makeState({
      answers: {
        'slide-03': { kind: 'text', values: { 'aim-dish': 'old value' } },
      },
    })
    const next = lessonReducer(state, {
      type: 'SET_TEXT_ANSWER',
      slideId: 'slide-03',
      promptId: 'aim-dish',
      value: 'new value',
    })
    const answers = next.answers['slide-03']
    if (answers?.kind === 'text') {
      expect(answers.values['aim-dish']).toBe('new value')
    }
  })
})

// ── SET_TABLE_ROW ─────────────────────────────────────────────────────────────

describe('SET_TABLE_ROW', () => {
  it('stores a cell value at the given row index and column', () => {
    const state = makeState()
    const next = lessonReducer(state, {
      type: 'SET_TABLE_ROW',
      slideId: 'slide-05',
      rowIndex: 0,
      columnId: 'what',
      value: 'Research equipment',
    })
    const answers = next.answers['slide-05']
    expect(answers?.kind).toBe('table')
    if (answers?.kind === 'table') {
      expect(answers.rows[0]['what']).toBe('Research equipment')
    }
  })

  it('expands the rows array automatically', () => {
    const state = makeState()
    const next = lessonReducer(state, {
      type: 'SET_TABLE_ROW',
      slideId: 'slide-05',
      rowIndex: 2,
      columnId: 'why',
      value: 'Planning ahead',
    })
    const answers = next.answers['slide-05']
    if (answers?.kind === 'table') {
      expect(answers.rows).toHaveLength(3)
      expect(answers.rows[2]['why']).toBe('Planning ahead')
    }
  })

  it('preserves existing cell values in the same row', () => {
    const state = makeState({
      answers: {
        'slide-05': {
          kind: 'table',
          rows: [{ when: 'Week 6', what: 'Research', why: '' }],
        },
      },
    })
    const next = lessonReducer(state, {
      type: 'SET_TABLE_ROW',
      slideId: 'slide-05',
      rowIndex: 0,
      columnId: 'why',
      value: 'To prepare',
    })
    const answers = next.answers['slide-05']
    if (answers?.kind === 'table') {
      expect(answers.rows[0]['when']).toBe('Week 6')
      expect(answers.rows[0]['what']).toBe('Research')
      expect(answers.rows[0]['why']).toBe('To prepare')
    }
  })
})

// ── COMMIT ────────────────────────────────────────────────────────────────────

describe('COMMIT', () => {
  it('assembles a framed paragraph and stores it in committed', () => {
    const state = makeState({
      answers: {
        'slide-03': {
          kind: 'text',
          values: {
            'aim-dish': 'vanilla custard French toast',
            'aim-tech': 'Thermomix',
          },
        },
      },
    })
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-03' })
    expect(next.committed['aim']).toBeDefined()
    expect(next.committed['aim']?.text).toContain('vanilla custard French toast')
    expect(next.committed['aim']?.text).toContain('Thermomix')
    expect(next.committed['aim']?.section).toBe('aim')
    expect(next.committed['aim']?.committedAt).toBeGreaterThan(0)
  })

  it('records engine warnings alongside the committed paragraph', () => {
    // Commit with empty answers — engine emits EMPTY_ANSWER warnings
    const state = makeState()
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-03' })
    expect(next.committed['aim']).toBeDefined()
    expect(next.committed['aim']?.warnings.length).toBeGreaterThan(0)
  })

  it('assembles a guided paragraph and keys it by section', () => {
    const state = makeState({
      answers: {
        'slide-04': {
          kind: 'text',
          values: {
            'decision-sentence': 'The group will produce French toast using the Thermomix.',
          },
        },
      },
    })
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-04' })
    expect(next.committed['decision']?.text).toContain('French toast')
  })

  it('assembles a freeform-table paragraph', () => {
    const state = makeState({
      answers: {
        'slide-05': {
          kind: 'table',
          rows: [
            { when: 'Week 6', what: 'Research Thermomix', why: 'To understand the technology.' },
            { when: 'Week 7', what: 'Finalise dish', why: 'To confirm the food order.' },
          ],
        },
      },
    })
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-05' })
    expect(next.committed['implementation']?.text).toContain('Week 6')
  })

  it('is a no-op for a content slide', () => {
    const state = makeState()
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-01' })
    expect(next.committed).toEqual({})
  })

  it('is a no-op for an mcq slide', () => {
    const state = makeState()
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-02' })
    expect(next.committed).toEqual({})
  })

  it('replaces a previously committed paragraph for the same section', () => {
    const state = makeState({
      answers: {
        'slide-03': {
          kind: 'text',
          values: { 'aim-dish': 'first version', 'aim-tech': 'Thermomix' },
        },
      },
      committed: {
        aim: {
          section: 'aim',
          text: 'old paragraph',
          warnings: [],
          committedAt: 1000,
        },
      },
    })
    const next = lessonReducer(state, { type: 'COMMIT', slideId: 'slide-03' })
    expect(next.committed['aim']?.text).not.toBe('old paragraph')
    expect(next.committed['aim']?.text).toContain('first version')
  })
})

// ── UNCOMMIT ──────────────────────────────────────────────────────────────────

describe('UNCOMMIT', () => {
  it('removes the committed paragraph for the slide section', () => {
    const state = makeState({
      committed: {
        aim: {
          section: 'aim',
          text: 'some paragraph',
          warnings: [],
          committedAt: 1000,
        },
      },
    })
    const next = lessonReducer(state, { type: 'UNCOMMIT', slideId: 'slide-03' })
    expect(next.committed['aim']).toBeUndefined()
  })

  it('does not affect other committed sections', () => {
    const state = makeState({
      committed: {
        aim: { section: 'aim', text: 'aim text', warnings: [], committedAt: 1000 },
        decision: { section: 'decision', text: 'decision text', warnings: [], committedAt: 2000 },
      },
    })
    const next = lessonReducer(state, { type: 'UNCOMMIT', slideId: 'slide-03' })
    expect(next.committed['decision']).toBeDefined()
    expect(next.committed['aim']).toBeUndefined()
  })

  it('is a no-op for a content slide', () => {
    const state = makeState({
      committed: {
        aim: { section: 'aim', text: 'aim text', warnings: [], committedAt: 1000 },
      },
    })
    const next = lessonReducer(state, { type: 'UNCOMMIT', slideId: 'slide-01' })
    expect(next.committed['aim']).toBeDefined()
  })
})

// ── TOGGLE_LOCK ───────────────────────────────────────────────────────────────

describe('TOGGLE_LOCK', () => {
  it('locks a slide that was unlocked', () => {
    const state = makeState()
    const next = lessonReducer(state, { type: 'TOGGLE_LOCK', slideId: 'slide-03' })
    expect(next.locks['slide-03']).toBe(true)
  })

  it('unlocks a slide that was locked', () => {
    const state = makeState({ locks: { 'slide-03': true } })
    const next = lessonReducer(state, { type: 'TOGGLE_LOCK', slideId: 'slide-03' })
    expect(next.locks['slide-03']).toBe(false)
  })
})

// ── OPEN_SHORTCUTS / CLOSE_SHORTCUTS ─────────────────────────────────────────

describe('OPEN_SHORTCUTS', () => {
  it('sets shortcutsOpen to true', () => {
    const state = makeState()
    const next = lessonReducer(state, { type: 'OPEN_SHORTCUTS' })
    expect(next.ui.shortcutsOpen).toBe(true)
  })
})

describe('CLOSE_SHORTCUTS', () => {
  it('sets shortcutsOpen to false', () => {
    const state = makeState({ ui: { shortcutsOpen: true, reviewTab: 'raw' } })
    const next = lessonReducer(state, { type: 'CLOSE_SHORTCUTS' })
    expect(next.ui.shortcutsOpen).toBe(false)
  })
})

// ── SET_REVIEW_TAB ────────────────────────────────────────────────────────────

describe('SET_REVIEW_TAB', () => {
  it('sets the review tab to polished', () => {
    const state = makeState()
    const next = lessonReducer(state, { type: 'SET_REVIEW_TAB', tab: 'polished' })
    expect(next.ui.reviewTab).toBe('polished')
  })

  it('sets the review tab back to raw', () => {
    const state = makeState({ ui: { shortcutsOpen: false, reviewTab: 'polished' } })
    const next = lessonReducer(state, { type: 'SET_REVIEW_TAB', tab: 'raw' })
    expect(next.ui.reviewTab).toBe('raw')
  })
})

// ── makeLessonState ───────────────────────────────────────────────────────────

describe('makeLessonState', () => {
  it('initialises with the first slide active', () => {
    const state = makeLessonState('kitchen-technologies', allSlides)
    expect(state.currentSlideIndex).toBe(0)
  })

  it('initialises with empty answers, committed, and locks', () => {
    const state = makeLessonState('kitchen-technologies', allSlides)
    expect(state.answers).toEqual({})
    expect(state.committed).toEqual({})
    expect(state.locks).toEqual({})
  })

  it('initialises the ui with shortcuts closed and raw tab', () => {
    const state = makeLessonState('kitchen-technologies', allSlides)
    expect(state.ui.shortcutsOpen).toBe(false)
    expect(state.ui.reviewTab).toBe('raw')
  })
})
