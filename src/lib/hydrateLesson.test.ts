/**
 * hydrateLesson tests.
 *
 * Uses vi.hoisted() to build an in-memory Dexie mock and hoisted Supabase
 * mock so both are available inside vi.mock factory functions.
 *
 * Three scenarios:
 *   1. Supabase has committed Aim + Issues; Dexie has a newer draft for
 *      Decision prompt — verify merged result.
 *   2. Server drafts are newer than Dexie — server values win.
 *   3. No Supabase data, Dexie has drafts — Dexie-only path works.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'

// ── In-memory Dexie mock ──────────────────────────────────────────────────────

type MockDraft = {
  id: string
  lessonId: string
  slideId: string
  promptId: string
  value: string
  updatedAt: number
  syncedAt: number | null
}

const { draftStore, mockDrafts } = vi.hoisted(() => {
  const store = new Map<string, MockDraft>()

  const drafts = {
    where: (field: string) => ({
      equals: (val: unknown) => ({
        toArray: () =>
          Promise.resolve(
            field === 'lessonId' ? [...store.values()].filter((r) => r.lessonId === val) : []
          ),
      }),
    }),
    put: (record: MockDraft) => {
      store.set(record.id, record)
      return Promise.resolve(record.id)
    },
  }

  return { draftStore: store, mockDrafts: drafts }
})

vi.mock('@/lib/dexieDb', () => ({ db: { drafts: mockDrafts } }))

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  // eq chains are ignored in the mock (all rows match any eq filter)
  type Builder = {
    select: () => Builder
    eq: (col: string, val: unknown) => Builder
    maybeSingle: () => Promise<{ data: unknown; error: null }>
    then: (resolve: (v: unknown) => void) => Promise<unknown>
  }

  const makeBuilder = (rows: unknown[]): Builder => ({
    select: () => makeBuilder(rows),
    eq: (col: string, val: unknown) => {
      void col
      void val
      return makeBuilder(rows)
    },
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  })

  // Each table gets its own row store, settable per test.
  const tables: Record<string, unknown[]> = {
    lesson_submissions: [],
    lesson_drafts: [],
    lesson_progress: [],
  }

  const from = (table: string) => makeBuilder(tables[table] ?? [])

  return { supabaseMock: { tables, from } }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedDexie(draft: MockDraft) {
  draftStore.set(draft.id, draft)
}

beforeEach(() => {
  draftStore.clear()
  supabaseMock.tables['lesson_submissions'] = []
  supabaseMock.tables['lesson_drafts'] = []
  supabaseMock.tables['lesson_progress'] = []
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('hydrateLesson — null studentId', () => {
  it('returns empty state without hitting Supabase', async () => {
    const { hydrateLesson } = await import('./hydrateLesson')
    const result = await hydrateLesson(null, 'lesson-01')
    expect(result.answers).toEqual({})
    expect(result.committed).toEqual({})
    expect(result.currentSlideIndex).toBe(0)
    expect(result.status).toBe('not_started')
  })
})

describe('hydrateLesson — Test case 1: committed Aim + Issues, newer Dexie draft for Decision', () => {
  it('returns committed sections and picks the newer Dexie draft value', async () => {
    // Supabase: two committed sections
    supabaseMock.tables['lesson_submissions'] = [
      {
        slide_id: 'slide-aim',
        section: 'aim',
        committed_paragraph: 'The aim paragraph.',
        committed_at: '2026-01-01T10:00:00Z',
        prompt_answers: null,
      },
      {
        slide_id: 'slide-issues',
        section: 'issues',
        committed_paragraph: 'The issues paragraph.',
        committed_at: '2026-01-01T10:05:00Z',
        prompt_answers: null,
      },
    ]

    // Supabase: server draft for Decision (older)
    const serverDraftTs = new Date('2026-01-01T10:10:00Z').getTime()
    supabaseMock.tables['lesson_drafts'] = [
      {
        slide_id: 'slide-decision',
        prompt_id: 'decision-sentence',
        value: 'Server draft value (older)',
        updated_at: new Date(serverDraftTs).toISOString(),
      },
    ]

    // Dexie: Decision draft newer than server
    const dexieTs = serverDraftTs + 5000
    seedDexie({
      id: 'lesson-01:slide-decision:decision-sentence',
      lessonId: 'lesson-01',
      slideId: 'slide-decision',
      promptId: 'decision-sentence',
      value: 'Dexie draft value (newer)',
      updatedAt: dexieTs,
      syncedAt: null,
    })

    const { hydrateLesson } = await import('./hydrateLesson')
    const result = await hydrateLesson('student-uuid', 'lesson-01')

    // Committed sections from submissions
    expect(result.committed['aim']?.text).toBe('The aim paragraph.')
    expect(result.committed['issues']?.text).toBe('The issues paragraph.')

    // Decision draft — Dexie wins (newer)
    expect(result.answers['slide-decision']).toEqual({
      kind: 'text',
      values: { 'decision-sentence': 'Dexie draft value (newer)' },
    })
  })
})

describe('hydrateLesson — Test case 2: server draft newer than Dexie', () => {
  it('server value wins when its timestamp is newer', async () => {
    const dexieTs = new Date('2026-01-01T09:00:00Z').getTime()
    const serverTs = new Date('2026-01-01T11:00:00Z').getTime() // newer

    supabaseMock.tables['lesson_drafts'] = [
      {
        slide_id: 'slide-aim',
        prompt_id: 'aim-dish',
        value: 'Server value (newer)',
        updated_at: new Date(serverTs).toISOString(),
      },
    ]

    seedDexie({
      id: 'lesson-01:slide-aim:aim-dish',
      lessonId: 'lesson-01',
      slideId: 'slide-aim',
      promptId: 'aim-dish',
      value: 'Dexie value (older)',
      updatedAt: dexieTs,
      syncedAt: null,
    })

    const { hydrateLesson } = await import('./hydrateLesson')
    const result = await hydrateLesson('student-uuid', 'lesson-01')

    expect(result.answers['slide-aim']).toEqual({
      kind: 'text',
      values: { 'aim-dish': 'Server value (newer)' },
    })
  })
})

describe('hydrateLesson — Test case 3: no Supabase data, Dexie has drafts', () => {
  it('returns Dexie drafts when Supabase returns empty', async () => {
    seedDexie({
      id: 'lesson-01:slide-aim:aim-dish',
      lessonId: 'lesson-01',
      slideId: 'slide-aim',
      promptId: 'aim-dish',
      value: 'Only in Dexie',
      updatedAt: Date.now(),
      syncedAt: null,
    })
    seedDexie({
      id: 'lesson-01:slide-aim:aim-technology',
      lessonId: 'lesson-01',
      slideId: 'slide-aim',
      promptId: 'aim-technology',
      value: 'Thermomix',
      updatedAt: Date.now(),
      syncedAt: null,
    })

    const { hydrateLesson } = await import('./hydrateLesson')
    const result = await hydrateLesson('student-uuid', 'lesson-01')

    expect(result.committed).toEqual({})
    expect(result.answers['slide-aim']).toEqual({
      kind: 'text',
      values: { 'aim-dish': 'Only in Dexie', 'aim-technology': 'Thermomix' },
    })
  })
})

describe('hydrateLesson — MCQ submissions', () => {
  it('sets mcqResult:correct and mcqSelection from a null-section submission', async () => {
    supabaseMock.tables['lesson_submissions'] = [
      {
        slide_id: 'slide-mcq',
        section: null,
        committed_paragraph: null,
        committed_at: '2026-01-01T10:00:00Z',
        prompt_answers: { selectedOption: 'b' },
      },
    ]

    const { hydrateLesson } = await import('./hydrateLesson')
    const result = await hydrateLesson('student-uuid', 'lesson-01')

    expect(result.answers['slide-mcq']).toEqual({
      kind: 'text',
      values: { mcqResult: 'correct', mcqSelection: 'b' },
    })
  })
})

describe('hydrateLesson — progress', () => {
  it('reads currentSlideIndex and status from lesson_progress', async () => {
    supabaseMock.tables['lesson_progress'] = [{ current_slide_index: 7, status: 'in_progress' }]

    const { hydrateLesson } = await import('./hydrateLesson')
    const result = await hydrateLesson('student-uuid', 'lesson-01')

    expect(result.currentSlideIndex).toBe(7)
    expect(result.status).toBe('in_progress')
  })
})

describe('hydrateLessonFromDexie', () => {
  it('reconstructs answers from Dexie when Supabase is unavailable', async () => {
    seedDexie({
      id: 'lesson-01:slide-aim:aim-dish',
      lessonId: 'lesson-01',
      slideId: 'slide-aim',
      promptId: 'aim-dish',
      value: 'Local only',
      updatedAt: Date.now(),
      syncedAt: null,
    })

    const { hydrateLessonFromDexie } = await import('./hydrateLesson')
    const result = await hydrateLessonFromDexie('lesson-01')

    expect(result.committed).toEqual({})
    expect(result.currentSlideIndex).toBe(0)
    expect(result.answers['slide-aim']).toEqual({
      kind: 'text',
      values: { 'aim-dish': 'Local only' },
    })
  })
})
