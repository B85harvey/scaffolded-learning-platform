/**
 * Dexie draft store tests.
 *
 * Uses fake-indexeddb to run IndexedDB in Node/jsdom without a real browser.
 * Each test gets a fresh database instance to prevent cross-test state leakage.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import type { DraftRecord } from './dexieDb'

// ── Fresh DB per test ─────────────────────────────────────────────────────────

class TestLessonDB extends Dexie {
  drafts!: Dexie.Table<DraftRecord, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      drafts: 'id, lessonId, [lessonId+slideId]',
    })
  }
}

let db: TestLessonDB
let dbCounter = 0

beforeEach(() => {
  // Fresh database name avoids stale state across tests
  db = new TestLessonDB(`TestLessonDB_${dbCounter++}`)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDraft(overrides: Partial<DraftRecord> = {}): DraftRecord {
  return {
    id: 'lesson-01:slide-01:prompt-topic',
    lessonId: 'lesson-01',
    slideId: 'slide-01',
    promptId: 'prompt-topic',
    value: 'vanilla custard French toast',
    updatedAt: Date.now(),
    syncedAt: null,
    ...overrides,
  }
}

// ── Write and read back ───────────────────────────────────────────────────────

describe('DraftRecord — write and read', () => {
  it('writes a draft and reads it back by id', async () => {
    const draft = makeDraft()
    await db.drafts.put(draft)

    const result = await db.drafts.get(draft.id)
    expect(result).toBeDefined()
    expect(result!.value).toBe('vanilla custard French toast')
    expect(result!.syncedAt).toBeNull()
  })

  it('stores lessonId, slideId, promptId correctly', async () => {
    const draft = makeDraft()
    await db.drafts.put(draft)

    const result = await db.drafts.get(draft.id)
    expect(result!.lessonId).toBe('lesson-01')
    expect(result!.slideId).toBe('slide-01')
    expect(result!.promptId).toBe('prompt-topic')
  })
})

// ── Update ────────────────────────────────────────────────────────────────────

describe('DraftRecord — update', () => {
  it('updates value and updatedAt via put', async () => {
    const draft = makeDraft({ updatedAt: 1000 })
    await db.drafts.put(draft)

    const updated: DraftRecord = { ...draft, value: 'with caramel glaze', updatedAt: 2000 }
    await db.drafts.put(updated)

    const result = await db.drafts.get(draft.id)
    expect(result!.value).toBe('with caramel glaze')
    expect(result!.updatedAt).toBe(2000)
  })

  it('sets syncedAt from null to a timestamp', async () => {
    const draft = makeDraft({ syncedAt: null })
    await db.drafts.put(draft)

    await db.drafts.update(draft.id, { syncedAt: 3000 })

    const result = await db.drafts.get(draft.id)
    expect(result!.syncedAt).toBe(3000)
  })

  it('can clear syncedAt back to null after a re-edit', async () => {
    const draft = makeDraft({ syncedAt: 3000 })
    await db.drafts.put(draft)

    await db.drafts.update(draft.id, { syncedAt: null, value: 'edited again', updatedAt: 4000 })

    const result = await db.drafts.get(draft.id)
    expect(result!.syncedAt).toBeNull()
    expect(result!.value).toBe('edited again')
  })
})

// ── Compound index query ──────────────────────────────────────────────────────

describe('DraftRecord — index queries', () => {
  it('queries all drafts for a lessonId', async () => {
    await db.drafts.bulkPut([
      makeDraft({ id: 'lesson-01:slide-01:topic', slideId: 'slide-01', promptId: 'topic' }),
      makeDraft({ id: 'lesson-01:slide-01:quality', slideId: 'slide-01', promptId: 'quality' }),
      makeDraft({
        id: 'lesson-02:slide-03:topic',
        lessonId: 'lesson-02',
        slideId: 'slide-03',
        promptId: 'topic',
      }),
    ])

    const lesson01Drafts = await db.drafts.where('lessonId').equals('lesson-01').toArray()
    expect(lesson01Drafts).toHaveLength(2)
  })

  it('queries all drafts for a lessonId+slideId compound key', async () => {
    await db.drafts.bulkPut([
      makeDraft({ id: 'lesson-01:slide-01:topic', slideId: 'slide-01', promptId: 'topic' }),
      makeDraft({ id: 'lesson-01:slide-01:quality', slideId: 'slide-01', promptId: 'quality' }),
      makeDraft({ id: 'lesson-01:slide-02:topic', slideId: 'slide-02', promptId: 'topic' }),
    ])

    const slide01Drafts = await db.drafts
      .where('[lessonId+slideId]')
      .equals(['lesson-01', 'slide-01'])
      .toArray()
    expect(slide01Drafts).toHaveLength(2)
  })
})

// ── Unsynced drafts ───────────────────────────────────────────────────────────

describe('DraftRecord — unsynced filter', () => {
  it('identifies unsynced drafts (syncedAt is null)', async () => {
    await db.drafts.bulkPut([
      makeDraft({ id: 'a', syncedAt: null }),
      makeDraft({ id: 'b', syncedAt: 1000 }),
      makeDraft({ id: 'c', syncedAt: null }),
    ])

    const all = await db.drafts.toArray()
    const unsynced = all.filter((d) => d.syncedAt === null)
    expect(unsynced).toHaveLength(2)
    expect(unsynced.map((d) => d.id).sort()).toEqual(['a', 'c'])
  })
})
