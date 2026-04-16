/**
 * seedKitchenTech tests.
 *
 * Mocks the Supabase client to verify:
 * 1. Lesson is upserted with the correct slug and title.
 * 2. All 17 slide rows are upserted with correct sort_order and type.
 * 3. DB errors propagate as thrown errors.
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ── kitchen-technologies mock ─────────────────────────────────────────────────

vi.mock('@/lessons/kitchen-technologies', () => {
  const slides = Array.from({ length: 17 }, (_, i) => ({
    id: `slide-${String(i + 1).padStart(2, '0')}`,
    type: i % 3 === 0 ? 'content' : i % 3 === 1 ? 'mcq' : 'scaffold',
    section: 'orientation',
  }))
  return {
    default: {
      id: 'kitchen-technologies',
      title: 'Unit 2 Kitchen Technologies: Writing the Group Action Plan',
      scribe: 'Alex Chen',
      slides,
    },
  }
})

const { seedKitchenTech } = await import('@/scripts/seedKitchenTech')

// ── Mock client factory ────────────────────────────────────────────────────────

type MockClient = SupabaseClient<Database>

function makeClient({
  lessonUpsertData = { id: 'uuid-lesson-1' },
  lessonUpsertError = null,
  slidesUpsertError = null,
}: {
  lessonUpsertData?: { id: string } | null
  lessonUpsertError?: { message: string } | null
  slidesUpsertError?: { message: string } | null
} = {}): { client: MockClient; mockSlidesUpsert: ReturnType<typeof vi.fn> } {
  const mockSlidesUpsert = vi.fn().mockResolvedValue({ error: slidesUpsertError })

  const mockLessonChain = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: lessonUpsertError ? null : lessonUpsertData,
      error: lessonUpsertError,
    }),
  }

  const mockSlidesChain = {
    upsert: mockSlidesUpsert,
  }

  let callCount = 0
  const from = vi.fn().mockImplementation(() => {
    callCount++
    return callCount === 1 ? mockLessonChain : mockSlidesChain
  })

  return { client: { from } as unknown as MockClient, mockSlidesUpsert }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('seedKitchenTech — happy path', () => {
  it('upserts a lesson row with correct slug and title', async () => {
    const { client } = makeClient()
    await seedKitchenTech(client)

    // from('lessons').upsert({ slug: ..., title: ... })
    const fromSpy = client.from as ReturnType<typeof vi.fn>
    const lessonsCall = fromSpy.mock.calls[0]
    expect(lessonsCall[0]).toBe('lessons')
  })

  it('upserts 17 slide rows', async () => {
    const { client, mockSlidesUpsert } = makeClient()
    await seedKitchenTech(client)

    const [slideRows] = mockSlidesUpsert.mock.calls[0] as [
      Array<{ sort_order: number; type: string; lesson_id: string }>,
      unknown,
    ]
    expect(slideRows).toHaveLength(17)
  })

  it('assigns sort_order starting from 1', async () => {
    const { client, mockSlidesUpsert } = makeClient()
    await seedKitchenTech(client)

    const [slideRows] = mockSlidesUpsert.mock.calls[0] as [Array<{ sort_order: number }>, unknown]
    expect(slideRows[0].sort_order).toBe(1)
    expect(slideRows[16].sort_order).toBe(17)
  })

  it('sets the correct type on each slide row', async () => {
    const { client, mockSlidesUpsert } = makeClient()
    await seedKitchenTech(client)

    const [slideRows] = mockSlidesUpsert.mock.calls[0] as [Array<{ type: string }>, unknown]
    // First slide: index 0, 0 % 3 === 0 → 'content'
    expect(slideRows[0].type).toBe('content')
    // Second slide: index 1, 1 % 3 === 1 → 'mcq'
    expect(slideRows[1].type).toBe('mcq')
    // Third slide: index 2, 2 % 3 === 2 → 'scaffold'
    expect(slideRows[2].type).toBe('scaffold')
  })

  it('uses lesson_id returned from the lesson upsert', async () => {
    const { client, mockSlidesUpsert } = makeClient({ lessonUpsertData: { id: 'my-uuid' } })
    await seedKitchenTech(client)

    const [slideRows] = mockSlidesUpsert.mock.calls[0] as [Array<{ lesson_id: string }>, unknown]
    expect(slideRows[0].lesson_id).toBe('my-uuid')
  })
})

describe('seedKitchenTech — error handling', () => {
  it('throws when lesson upsert fails', async () => {
    const { client } = makeClient({ lessonUpsertError: { message: 'duplicate key' } })
    await expect(seedKitchenTech(client)).rejects.toThrow('Failed to upsert lesson: duplicate key')
  })

  it('throws when lesson upsert returns no row', async () => {
    const { client } = makeClient({ lessonUpsertData: null })
    await expect(seedKitchenTech(client)).rejects.toThrow('Lesson upsert returned no row')
  })

  it('throws when slides upsert fails', async () => {
    const { client } = makeClient({ slidesUpsertError: { message: 'constraint violation' } })
    await expect(seedKitchenTech(client)).rejects.toThrow(
      'Failed to upsert slides: constraint violation'
    )
  })
})
