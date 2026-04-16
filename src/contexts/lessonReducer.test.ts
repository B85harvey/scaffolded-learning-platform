/**
 * lessonReducer — HYDRATE action tests.
 *
 * Verifies that:
 *   - HYDRATE sets answers, committed, locks, currentSlideIndex, and
 *     rebuilds committedSlideIds from the committed map.
 *   - A second HYDRATE dispatch is a no-op (hydrated guard).
 */
import { describe, it, expect } from 'vitest'
import { lessonReducer, makeLessonState } from './lessonReducer'
import type { LessonAction, LessonState } from './lessonReducer'
import type { SlideConfig, CommittedParagraph } from '@/lessons/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function scaffoldSlide(id: string, section: SlideConfig['section']): SlideConfig {
  return {
    id,
    type: 'scaffold',
    section,
    mode: 'framed',
    config: { id, targetQuestion: '', mode: 'framed' },
  }
}

function contentSlide(id: string): SlideConfig {
  return { id, type: 'content', section: 'orientation', body: '' }
}

function committed(section: string): CommittedParagraph {
  return {
    section: section as CommittedParagraph['section'],
    text: `${section} paragraph`,
    warnings: [],
    committedAt: 1000,
  }
}

const SLIDES: SlideConfig[] = [
  contentSlide('slide-intro'),
  scaffoldSlide('slide-aim', 'aim'),
  scaffoldSlide('slide-issues', 'issues'),
  scaffoldSlide('slide-decision', 'decision'),
]

function makeState(): LessonState {
  return makeLessonState('lesson-01', SLIDES)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HYDRATE action', () => {
  it('sets answers from the payload', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: {
          'slide-aim': { kind: 'text', values: { 'aim-dish': 'Vanilla custard' } },
        },
        committed: {},
        locks: {},
        currentSlideIndex: 0,
      },
    }
    const next = lessonReducer(state, action)
    expect(next.answers['slide-aim']).toEqual({
      kind: 'text',
      values: { 'aim-dish': 'Vanilla custard' },
    })
  })

  it('sets committed from the payload', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: {},
        committed: { aim: committed('aim'), issues: committed('issues') },
        locks: {},
        currentSlideIndex: 0,
      },
    }
    const next = lessonReducer(state, action)
    expect(next.committed['aim']?.text).toBe('aim paragraph')
    expect(next.committed['issues']?.text).toBe('issues paragraph')
  })

  it('sets locks from the payload', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: {},
        committed: {},
        locks: { 'slide-decision': true },
        currentSlideIndex: 0,
      },
    }
    const next = lessonReducer(state, action)
    expect(next.locks['slide-decision']).toBe(true)
  })

  it('rebuilds committedSlideIds from committed + slides', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: {},
        committed: { aim: committed('aim'), issues: committed('issues') },
        locks: {},
        currentSlideIndex: 0,
      },
    }
    const next = lessonReducer(state, action)
    expect(next.committedSlideIds).toContain('slide-aim')
    expect(next.committedSlideIds).toContain('slide-issues')
    expect(next.committedSlideIds).not.toContain('slide-decision')
  })

  it('sets currentSlideIndex from the payload', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: {},
        committed: {},
        locks: {},
        currentSlideIndex: 2,
      },
    }
    const next = lessonReducer(state, action)
    expect(next.currentSlideIndex).toBe(2)
  })

  it('sets hydrated to true', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: { answers: {}, committed: {}, locks: {}, currentSlideIndex: 0 },
    }
    const next = lessonReducer(state, action)
    expect(next.hydrated).toBe(true)
  })

  it('is a no-op when dispatched a second time (already hydrated)', () => {
    const state = makeState()
    const hydrateOnce: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: { 'slide-aim': { kind: 'text', values: { x: 'first' } } },
        committed: {},
        locks: {},
        currentSlideIndex: 1,
      },
    }
    const hydrateAgain: LessonAction = {
      type: 'HYDRATE',
      payload: {
        answers: { 'slide-aim': { kind: 'text', values: { x: 'second' } } },
        committed: {},
        locks: {},
        currentSlideIndex: 3,
      },
    }

    const afterFirst = lessonReducer(state, hydrateOnce)
    const afterSecond = lessonReducer(afterFirst, hydrateAgain)

    // Second HYDRATE must not overwrite anything
    expect(afterSecond.answers['slide-aim']).toEqual({
      kind: 'text',
      values: { x: 'first' },
    })
    expect(afterSecond.currentSlideIndex).toBe(1)
  })

  it('clamps currentSlideIndex to valid range', () => {
    const state = makeState()
    const action: LessonAction = {
      type: 'HYDRATE',
      payload: { answers: {}, committed: {}, locks: {}, currentSlideIndex: 999 },
    }
    const next = lessonReducer(state, action)
    expect(next.currentSlideIndex).toBe(SLIDES.length - 1)
  })
})
