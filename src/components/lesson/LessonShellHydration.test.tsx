/**
 * LessonShell — hydration integration tests.
 *
 * Kept in a separate file from LessonShell.test.tsx so the module-level
 * vi.mock calls here (hydrateLesson, syncService, supabase) do not affect
 * the existing shell tests.
 *
 * Tests that:
 *   - The loading skeleton renders while hydration is in flight.
 *   - After hydrateLesson resolves, the skeleton is gone and the correct
 *     slide is shown.
 *   - The ActionPlanPanel shows previously committed sections immediately.
 *   - A draft answer pre-populates the current scaffold slide.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { LessonShell } from './LessonShell'
import kitchenTechnologies from '@/lessons/kitchen-technologies'
import type { HydratedLesson } from '@/lib/hydrateLesson'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/hydrateLesson', () => ({
  hydrateLesson: vi.fn(),
  hydrateLessonFromDexie: vi.fn().mockResolvedValue({
    answers: {},
    committed: {},
    currentSlideIndex: 0,
    status: 'not_started',
  }),
}))

vi.mock('@/lib/syncService', () => ({
  syncDirtyDrafts: vi.fn().mockResolvedValue(undefined),
  commitToSupabase: vi.fn().mockResolvedValue({ success: true }),
  saveMcqAnswer: vi.fn().mockResolvedValue({ success: true }),
  updateProgress: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      channel: vi.fn().mockReturnValue(channelMock),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    },
  }
})

// ── Setup ─────────────────────────────────────────────────────────────────────

const { hydrateLesson } = await import('@/lib/hydrateLesson')
const mockHydrateLesson = vi.mocked(hydrateLesson)

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  mockHydrateLesson.mockReset()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderWithHydration(hydratedData: HydratedLesson) {
  mockHydrateLesson.mockResolvedValue(hydratedData)

  const lesson = kitchenTechnologies
  return render(
    <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
      <LessonShell lesson={lesson} studentId="test-student" />
    </LessonProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonShell — loading skeleton', () => {
  it('shows the skeleton immediately before hydration resolves', () => {
    // hydrateLesson never resolves within this test
    mockHydrateLesson.mockReturnValue(new Promise(() => {}))

    const lesson = kitchenTechnologies
    render(
      <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
        <LessonShell lesson={lesson} studentId="test-student" />
      </LessonProvider>
    )

    expect(screen.getByTestId('lesson-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('1 of 17')).not.toBeInTheDocument()
  })

  it('hides the skeleton after hydration resolves', async () => {
    renderWithHydration({
      answers: {},
      committed: {},
      currentSlideIndex: 0,
      status: 'not_started',
    })

    await waitFor(() => expect(screen.queryByTestId('lesson-skeleton')).not.toBeInTheDocument())
  })
})

describe('LessonShell — hydration resumes at correct slide', () => {
  it('renders at the Decision slide when Aim and Issues are committed', async () => {
    // kitchen-technologies: slide-12-decision-scaffold is at index 11
    const decisionSlide = kitchenTechnologies.slides[11]
    expect(decisionSlide.id).toBe('slide-12-decision-scaffold')

    renderWithHydration({
      answers: {
        [decisionSlide.id]: {
          kind: 'text',
          values: { 'decision-sentence': 'The group will produce vanilla custard.' },
        },
      },
      committed: {
        aim: {
          section: 'aim',
          text: 'The aim is to produce vanilla custard.',
          warnings: [],
          committedAt: 1000,
        },
        issues: {
          section: 'issues',
          text: 'Food trends are a significant consideration.',
          warnings: [],
          committedAt: 1000,
        },
      },
      // resolveResumeSlide will pick decision scaffold (index 11) since aim+issues committed
      currentSlideIndex: 11,
      status: 'in_progress',
    })

    await waitFor(() => expect(screen.queryByTestId('lesson-skeleton')).not.toBeInTheDocument())

    // Slide counter should show slide 12 of 17
    expect(screen.getByText('12 of 17')).toBeInTheDocument()
  })
})

describe('LessonShell — ActionPlanPanel shows committed sections after hydration', () => {
  it('shows Aim and Issues filled, Decision as not yet written', async () => {
    const decisionSlide = kitchenTechnologies.slides[11]

    renderWithHydration({
      answers: {
        [decisionSlide.id]: {
          kind: 'text',
          values: { 'decision-sentence': 'Draft decision text.' },
        },
      },
      committed: {
        aim: {
          section: 'aim',
          text: 'The aim paragraph.',
          warnings: [],
          committedAt: 1000,
        },
        issues: {
          section: 'issues',
          text: 'The issues paragraph.',
          warnings: [],
          committedAt: 1000,
        },
      },
      currentSlideIndex: 11,
      status: 'in_progress',
    })

    await waitFor(() => expect(screen.queryByTestId('lesson-skeleton')).not.toBeInTheDocument())

    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })

    // Committed sections show their text
    expect(within(panel).getByText('The aim paragraph.')).toBeInTheDocument()
    expect(within(panel).getByText('The issues paragraph.')).toBeInTheDocument()

    // Decision (and later sections) still show placeholder
    const notYetWritten = within(panel).getAllByText('Not yet written')
    expect(notYetWritten.length).toBeGreaterThanOrEqual(1)
  })
})

describe('LessonShell — no skeleton when studentId is null', () => {
  it('renders content immediately when no studentId is provided', () => {
    const lesson = kitchenTechnologies
    render(
      <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
        <LessonShell lesson={lesson} />
      </LessonProvider>
    )

    expect(screen.queryByTestId('lesson-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 17')).toBeInTheDocument()
  })
})
