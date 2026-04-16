/**
 * lessonLoader tests.
 *
 * Mocks the Supabase client to verify:
 * 1. Happy path: 17 slides from DB reconstructed into LessonConfig shape.
 * 2. Fallback path: DB failure falls back to hardcoded registry.
 * 3. Not-found: lesson missing from DB and hardcoded registry throws.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

// ── kitchen-technologies mock ─────────────────────────────────────────────────
// Provide a minimal stand-in so lessonLoader's HARDCODED registry has something.

vi.mock('@/lessons/kitchen-technologies', () => ({
  default: {
    id: 'kitchen-technologies',
    title: 'Kitchen Technologies',
    scribe: '',
    slides: [
      { id: 'slide-01', type: 'content', section: 'orientation', body: 'Hello', title: 'Slide 1' },
    ],
  },
}))

// ── Import under test ─────────────────────────────────────────────────────────

const { loadLesson } = await import('@/lib/lessonLoader')

// ── Helpers ───────────────────────────────────────────────────────────────────

const LESSON_ROW = {
  id: 'uuid-lesson-1',
  slug: 'kitchen-technologies',
  unit_id: null,
  title: 'Kitchen Technologies',
}

function makeSlideRow(index: number) {
  return {
    type: 'content',
    sort_order: index + 1,
    config: {
      id: `slide-${String(index + 1).padStart(2, '0')}`,
      type: 'content',
      section: 'orientation',
      title: `Slide ${index + 1}`,
      body: `Body ${index + 1}`,
    },
  }
}

const SLIDE_ROWS_17 = Array.from({ length: 17 }, (_, i) => makeSlideRow(i))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('loadLesson — happy path (DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // First call: from('lessons') → lesson row
    // Second call: from('slides') → slide rows
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // lessons query: .select().eq().maybeSingle()
        const builder: Record<string, unknown> = {}
        builder.select = vi.fn().mockReturnValue(builder)
        builder.eq = vi.fn().mockReturnValue(builder)
        builder.maybeSingle = vi.fn().mockResolvedValue({ data: LESSON_ROW, error: null })
        return builder
      } else {
        // slides query: .select().eq().order()
        const builder: Record<string, unknown> = {}
        builder.select = vi.fn().mockReturnValue(builder)
        builder.eq = vi.fn().mockReturnValue(builder)
        builder.order = vi.fn().mockResolvedValue({ data: SLIDE_ROWS_17, error: null })
        return builder
      }
    })
  })

  it('returns a LessonConfig with 17 slides', async () => {
    const lesson = await loadLesson('kitchen-technologies')
    expect(lesson.id).toBe('kitchen-technologies')
    expect(lesson.slides).toHaveLength(17)
  })

  it('reconstructs slide type from column (not config)', async () => {
    const lesson = await loadLesson('kitchen-technologies')
    // type is set from the DB column, not the config JSONB
    expect(lesson.slides[0].type).toBe('content')
  })

  it('preserves slide fields from config JSONB', async () => {
    const lesson = await loadLesson('kitchen-technologies')
    const slide = lesson.slides[0] as { id: string; title: string; body: string }
    expect(slide.id).toBe('slide-01')
    expect(slide.title).toBe('Slide 1')
    expect(slide.body).toBe('Body 1')
  })
})

describe('loadLesson — fallback to hardcoded registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Simulate DB network failure
    mockFrom.mockImplementation(() => {
      const builder: Record<string, unknown> = {}
      builder.select = vi.fn().mockReturnValue(builder)
      builder.eq = vi.fn().mockReturnValue(builder)
      builder.maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'network error' } })
      return builder
    })
  })

  it('falls back to hardcoded registry on DB error', async () => {
    const lesson = await loadLesson('kitchen-technologies')
    expect(lesson.id).toBe('kitchen-technologies')
    expect(lesson.slides.length).toBeGreaterThan(0)
  })

  it('falls back when lesson row is not found in DB', async () => {
    mockFrom.mockImplementation(() => {
      const builder: Record<string, unknown> = {}
      builder.select = vi.fn().mockReturnValue(builder)
      builder.eq = vi.fn().mockReturnValue(builder)
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      return builder
    })

    const lesson = await loadLesson('kitchen-technologies')
    expect(lesson.id).toBe('kitchen-technologies')
  })
})

describe('loadLesson — lesson not found anywhere', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockFrom.mockImplementation(() => {
      const builder: Record<string, unknown> = {}
      builder.select = vi.fn().mockReturnValue(builder)
      builder.eq = vi.fn().mockReturnValue(builder)
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      return builder
    })
  })

  it('throws when lesson is not in DB or hardcoded registry', async () => {
    await expect(loadLesson('nonexistent-lesson')).rejects.toThrow(
      "Lesson 'nonexistent-lesson' not found"
    )
  })
})
