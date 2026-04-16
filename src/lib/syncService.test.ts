/**
 * syncService tests.
 *
 * commitToSupabase  — mocks Supabase + Dexie, verifies upsert payload and
 *                     syncedAt update on success.
 * syncDirtyDrafts   — seeds in-memory Dexie mock with 3 dirty records,
 *                     mocks Supabase upsert, verifies all records are synced.
 *
 * vi.hoisted() creates the draftStore and mock before vi.mock factories run,
 * so the factory can reference them without the "access before init" error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── In-memory draft store (hoisted so vi.mock factory can access it) ──────────

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
        modify: (updates: Partial<MockDraft>) => {
          for (const [id, r] of store.entries()) {
            const arr = val as [string, string]
            if (field === '[lessonId+slideId]' && r.lessonId === arr[0] && r.slideId === arr[1]) {
              store.set(id, { ...r, ...updates })
            }
          }
          return Promise.resolve(1)
        },
      }),
    }),
    put: (record: MockDraft) => {
      store.set(record.id, record)
      return Promise.resolve(record.id)
    },
    update: (id: string, updates: Partial<MockDraft>) => {
      const existing = store.get(id)
      if (existing) store.set(id, { ...existing, ...updates })
      return Promise.resolve(existing ? 1 : 0)
    },
    get: (id: string) => Promise.resolve(store.get(id)),
  }

  return { draftStore: store, mockDrafts: drafts }
})

vi.mock('@/lib/dexieDb', () => ({
  db: { drafts: mockDrafts },
}))

// ── Mock supabase ─────────────────────────────────────────────────────────────

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

// ── Mock SyncStatusContext ────────────────────────────────────────────────────

vi.mock('@/contexts/SyncStatusContext', () => ({
  setSyncStatus: vi.fn(),
}))

// ── Reset between tests ───────────────────────────────────────────────────────

beforeEach(() => {
  draftStore.clear()
  mockFrom.mockClear()
  mockUpsert.mockClear()
  mockUpsert.mockResolvedValue({ error: null })
})

// ── commitToSupabase ──────────────────────────────────────────────────────────

describe('commitToSupabase', () => {
  it('calls supabase.from("lesson_submissions").upsert with correct payload', async () => {
    const { commitToSupabase } = await import('./syncService')

    await commitToSupabase(
      'student-uuid',
      'lesson-01',
      'slide-05',
      'aim',
      { topic: 'Thermomix' },
      'The aim of this task is to use the Thermomix.'
    )

    expect(mockFrom).toHaveBeenCalledWith('lesson_submissions')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'student-uuid',
        lesson_id: 'lesson-01',
        slide_id: 'slide-05',
        section: 'aim',
        prompt_answers: { topic: 'Thermomix' },
        committed_paragraph: 'The aim of this task is to use the Thermomix.',
      })
    )
  })

  it('returns success: true on a clean upsert', async () => {
    const { commitToSupabase } = await import('./syncService')

    const result = await commitToSupabase(
      'student-uuid',
      'lesson-01',
      'slide-05',
      'aim',
      {},
      'paragraph'
    )

    expect(result.success).toBe(true)
  })

  it('returns success: false when studentId is null', async () => {
    const { commitToSupabase } = await import('./syncService')

    const result = await commitToSupabase(null, 'lesson-01', 'slide-05', 'aim', {}, 'p')
    expect(result.success).toBe(false)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('updates Dexie syncedAt for matching records on success', async () => {
    // Seed two draft records for this slide
    draftStore.set('lesson-01:slide-05:topic', {
      id: 'lesson-01:slide-05:topic',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'topic',
      value: 'Thermomix',
      updatedAt: 1000,
      syncedAt: null,
    })
    draftStore.set('lesson-01:slide-05:quality', {
      id: 'lesson-01:slide-05:quality',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'quality',
      value: 'efficient',
      updatedAt: 1000,
      syncedAt: null,
    })

    const { commitToSupabase } = await import('./syncService')
    await commitToSupabase('student-uuid', 'lesson-01', 'slide-05', 'aim', {}, 'paragraph')

    const topic = draftStore.get('lesson-01:slide-05:topic')
    const quality = draftStore.get('lesson-01:slide-05:quality')
    expect(topic!.syncedAt).not.toBeNull()
    expect(quality!.syncedAt).not.toBeNull()
  })

  it('returns error details when Supabase fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'RLS violation' } })

    const { commitToSupabase } = await import('./syncService')
    const result = await commitToSupabase(
      'student-uuid',
      'lesson-01',
      'slide-05',
      'aim',
      {},
      'paragraph'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('RLS violation')
  })
})

// ── syncDirtyDrafts ───────────────────────────────────────────────────────────

describe('syncDirtyDrafts', () => {
  it('upserts all dirty records into lesson_drafts', async () => {
    draftStore.set('lesson-01:slide-05:topic', {
      id: 'lesson-01:slide-05:topic',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'topic',
      value: 'value-a',
      updatedAt: 1000,
      syncedAt: null,
    })
    draftStore.set('lesson-01:slide-05:quality', {
      id: 'lesson-01:slide-05:quality',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'quality',
      value: 'value-b',
      updatedAt: 1000,
      syncedAt: null,
    })
    draftStore.set('lesson-01:slide-06:issue', {
      id: 'lesson-01:slide-06:issue',
      lessonId: 'lesson-01',
      slideId: 'slide-06',
      promptId: 'issue',
      value: 'value-c',
      updatedAt: 1000,
      syncedAt: null,
    })

    const { syncDirtyDrafts } = await import('./syncService')
    await syncDirtyDrafts('student-uuid', 'lesson-01')

    expect(mockFrom).toHaveBeenCalledWith('lesson_drafts')
    const upsertArg = mockUpsert.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(upsertArg).toHaveLength(3)
    expect(upsertArg.map((r) => r['prompt_id']).sort()).toEqual(['issue', 'quality', 'topic'])
  })

  it('sets syncedAt on all synced records', async () => {
    draftStore.set('lesson-01:slide-05:topic', {
      id: 'lesson-01:slide-05:topic',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'topic',
      value: 'x',
      updatedAt: 1000,
      syncedAt: null,
    })

    const { syncDirtyDrafts } = await import('./syncService')
    await syncDirtyDrafts('student-uuid', 'lesson-01')

    const record = draftStore.get('lesson-01:slide-05:topic')
    expect(record!.syncedAt).not.toBeNull()
  })

  it('skips already-synced records', async () => {
    draftStore.set('lesson-01:slide-05:topic', {
      id: 'lesson-01:slide-05:topic',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'topic',
      value: 'x',
      updatedAt: 1000,
      syncedAt: 1000, // already synced at same timestamp
    })

    const { syncDirtyDrafts } = await import('./syncService')
    await syncDirtyDrafts('student-uuid', 'lesson-01')

    // No upsert called — no dirty records
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('is a no-op when studentId is null', async () => {
    draftStore.set('lesson-01:slide-05:topic', {
      id: 'lesson-01:slide-05:topic',
      lessonId: 'lesson-01',
      slideId: 'slide-05',
      promptId: 'topic',
      value: 'x',
      updatedAt: 1000,
      syncedAt: null,
    })

    const { syncDirtyDrafts } = await import('./syncService')
    await syncDirtyDrafts(null, 'lesson-01')

    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
