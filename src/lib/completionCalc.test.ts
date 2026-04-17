/**
 * completionCalc tests.
 *
 * Mocks supabase to control lesson_submissions and lesson_progress rows.
 * Verifies calcUnitCompletion and calcLessonStatus return the expected values.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcUnitCompletion, calcLessonStatus } from './completionCalc'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    lesson_submissions: [],
    lesson_progress: [],
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (col: string, val: unknown) => {
        void col
        void val
        return makeBuilder(rows)
      },
      in: (col: string, vals: unknown[]) => {
        void col
        void vals
        return makeBuilder(rows)
      },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }

  return {
    supabaseMock: {
      tables,
      from: (table: string) => makeBuilder(tables[table] ?? []),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

beforeEach(() => {
  supabaseMock.tables['lesson_submissions'] = []
  supabaseMock.tables['lesson_progress'] = []
})

// ── calcUnitCompletion ────────────────────────────────────────────────────────

describe('calcUnitCompletion — no submissions', () => {
  it('returns 0 when no lesson_submissions exist', async () => {
    supabaseMock.tables['lesson_submissions'] = []
    const result = await calcUnitCompletion('student-1', 'unit-2')
    expect(result).toBe(0)
  })
})

describe('calcUnitCompletion — 3 of 6 sections committed', () => {
  it('returns 50 when aim, issues, and decision are committed', async () => {
    // kitchen-technologies has 6 distinct scaffold sections:
    // aim, issues, decision, justification, implementation, references.
    // Committing 3 of them → 3/6 = 50.
    supabaseMock.tables['lesson_submissions'] = [
      { section: 'aim', committed_paragraph: 'Aim text.', lesson_id: 'kitchen-technologies' },
      { section: 'issues', committed_paragraph: 'Issues text.', lesson_id: 'kitchen-technologies' },
      {
        section: 'decision',
        committed_paragraph: 'Decision text.',
        lesson_id: 'kitchen-technologies',
      },
      // Duplicate aim row — should not be counted twice.
      { section: 'aim', committed_paragraph: 'Another aim.', lesson_id: 'kitchen-technologies' },
    ]
    const result = await calcUnitCompletion('student-1', 'unit-2')
    expect(result).toBe(50)
  })
})

describe('calcUnitCompletion — all sections committed', () => {
  it('returns 100 when all 6 scaffold sections are committed', async () => {
    const sections = ['aim', 'issues', 'decision', 'justification', 'implementation', 'references']
    supabaseMock.tables['lesson_submissions'] = sections.map((section) => ({
      section,
      committed_paragraph: `${section} paragraph.`,
      lesson_id: 'kitchen-technologies',
    }))
    const result = await calcUnitCompletion('student-1', 'unit-2')
    expect(result).toBe(100)
  })
})

describe('calcUnitCompletion — uncommitted rows ignored', () => {
  it('excludes rows where committed_paragraph is null', async () => {
    supabaseMock.tables['lesson_submissions'] = [
      { section: 'aim', committed_paragraph: 'Aim text.', lesson_id: 'kitchen-technologies' },
      { section: 'issues', committed_paragraph: null, lesson_id: 'kitchen-technologies' },
    ]
    const result = await calcUnitCompletion('student-1', 'unit-2')
    // Only 'aim' is committed → 1/6 = 17%
    expect(result).toBe(17)
  })
})

describe('calcUnitCompletion — unit with no lessons', () => {
  it('returns 0 for a unit with no lesson IDs', async () => {
    const result = await calcUnitCompletion('student-1', 'unit-3')
    expect(result).toBe(0)
  })
})

// ── calcLessonStatus ──────────────────────────────────────────────────────────

describe('calcLessonStatus — in_progress at slide 7', () => {
  it('returns status and currentSlideIndex from the progress row', async () => {
    supabaseMock.tables['lesson_progress'] = [
      {
        lesson_id: 'kitchen-technologies',
        status: 'in_progress',
        current_slide_index: 6, // 0-based → slide 7 of 18
      },
    ]
    const result = await calcLessonStatus('student-1', 'kitchen-technologies')
    expect(result.status).toBe('in_progress')
    expect(result.currentSlideIndex).toBe(6)
  })
})

describe('calcLessonStatus — no progress row', () => {
  it('returns not_started with index 0 when no row exists', async () => {
    supabaseMock.tables['lesson_progress'] = []
    const result = await calcLessonStatus('student-1', 'kitchen-technologies')
    expect(result.status).toBe('not_started')
    expect(result.currentSlideIndex).toBe(0)
  })
})

describe('calcLessonStatus — complete', () => {
  it('returns complete status', async () => {
    supabaseMock.tables['lesson_progress'] = [
      { lesson_id: 'kitchen-technologies', status: 'complete', current_slide_index: 16 },
    ]
    const result = await calcLessonStatus('student-1', 'kitchen-technologies')
    expect(result.status).toBe('complete')
  })
})
