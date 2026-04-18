/**
 * Axe accessibility smoke tests — Phase 5 components.
 *
 * Mounts each Phase 5 component or page with representative data and asserts
 * zero critical/serious axe violations. colour-contrast is skipped because
 * jsdom cannot compute CSS computed styles.
 *
 * Components tested:
 *   SlideReview        — download menu open (.docx / .pdf options visible)
 *   TeacherDashboard   — "Download .csv" button + "Download Unit Review" buttons visible
 *   ReferenceBuilder   — Website type (default: URL + Accessed fields visible)
 *   ReferenceBuilder   — Journal type (Volume, Issue, Pages fields visible)
 *   References slide   — ReferenceBuilder rendered alongside the freeform table
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { SlideReview } from '@/components/lesson/slides/SlideReview'
import { SlideScaffold } from '@/components/lesson/slides/SlideScaffold'
import { ReferenceBuilder } from '@/components/scaffold/ReferenceBuilder'
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'
import { ToastRegion } from '@/components/ui/Toast'
import type { SlideConfig } from '@/lessons/types'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn(), useOptionalAuth: vi.fn() }))

const { channelMock } = vi.hoisted(() => {
  const mock = { on: vi.fn(), subscribe: vi.fn() }
  return { channelMock: mock }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue(channelMock),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/utils/generateLessonDocx', () => ({
  generateLessonDocx: vi.fn().mockResolvedValue(new Blob(['fake-docx'])),
}))

vi.mock('@/utils/triggerDownload', () => ({
  triggerDocxDownload: vi.fn(),
}))

vi.mock('@/utils/generateLessonCsv', () => ({
  generateLessonCsv: vi.fn().mockReturnValue('"Student","Aim"\n"Alex","Text."'),
}))

vi.mock('@/utils/generateUnitReviewDocx', () => ({
  generateUnitReviewDocx: vi.fn().mockResolvedValue(new Blob(['docx'])),
}))

// ── Shared constants ──────────────────────────────────────────────────────────

const { useAuth, useOptionalAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)
const mockUseOptionalAuth = vi.mocked(useOptionalAuth)
const { supabase } = await import('@/lib/supabase')
const mockFrom = vi.mocked(supabase.from)

const TEACHER = {
  session: { user: { id: 'teacher-1' } } as never,
  profile: {
    id: 'teacher-1',
    email: 't@school.edu',
    role: 'teacher' as const,
    display_name: 'Ms Harvey',
    created_at: '',
    updated_at: '',
  },
  loading: false,
  signOut: vi.fn(),
}

// ── Axe helper ────────────────────────────────────────────────────────────────

const AXE_CONFIG: axe.RunOptions = {
  rules: {
    // jsdom cannot compute CSS computed styles — all Phase 5 tokens are
    // manually validated against WCAG AA.
    'color-contrast': { enabled: false },
  },
}

async function runAxe(container: Element): Promise<axe.Result[]> {
  const results = await axe.run(container, AXE_CONFIG)
  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  )
  if (serious.length > 0) {
    console.error(
      'Axe violations:',
      serious.map((v) => `${v.id}: ${v.description} — ${v.nodes.map((n) => n.html).join(', ')}`)
    )
  }
  return serious
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(TEACHER)
  mockUseOptionalAuth.mockReturnValue(TEACHER)
  channelMock.on.mockReturnValue(channelMock)
  channelMock.subscribe.mockReturnValue(channelMock)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ── SlideReview — download menu open ─────────────────────────────────────────

const reviewSlide = { id: 'slide-review', type: 'review' as const, section: 'review' as const }

function renderReview() {
  const state = makeLessonState('test-lesson', [reviewSlide])
  return render(
    <LessonProvider initialState={state}>
      <ToastRegion />
      <SlideReview lessonTitle="Kitchen Technologies" studentName="Alex Smith" />
    </LessonProvider>
  )
}

describe('a11y-phase5 — SlideReview with download menu open', () => {
  it('has zero critical/serious axe violations', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    const { container } = renderReview()

    // Open the download menu so both menu items are in the DOM
    await user.click(screen.getByRole('button', { name: 'Download' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Download as .docx' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Download as .pdf' })).toBeInTheDocument()

    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── TeacherDashboard — csv button + Unit Review buttons ──────────────────────

const LESSON_ID = 'lesson-a11y'

const DASHBOARD_MCQ_SLIDE = {
  id: 'mcq-slide-1',
  sort_order: 1,
  type: 'mcq',
  config: {
    question: 'Which cooking method retains the most nutrients?',
    variant: 'class',
    options: [
      { id: 'opt-a', text: 'Boiling', correct: false },
      { id: 'opt-b', text: 'Steaming', correct: true },
    ],
  },
}

const DASHBOARD_SCAFFOLD_SLIDE = {
  id: 'scaffold-slide-1',
  sort_order: 2,
  type: 'scaffold',
  config: {
    section: 'aim',
    mode: 'framed',
    config: { targetQuestion: 'Statement of intent', mode: 'framed', id: 'cfg-1' },
  },
}

function setupDashboardMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'slides') {
      // Scaffold-only order (unit review download path)
      const scaffoldOrderFn = vi
        .fn()
        .mockResolvedValue({ data: [DASHBOARD_SCAFFOLD_SLIDE], error: null })
      // All-slides order (initial load)
      const allSlidesOrderFn = vi
        .fn()
        .mockResolvedValue({ data: [DASHBOARD_MCQ_SLIDE, DASHBOARD_SCAFFOLD_SLIDE], error: null })
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: allSlidesOrderFn,
            eq: vi.fn().mockReturnValue({ order: scaffoldOrderFn }),
          }),
        }),
      } as never
    }
    if (table === 'lessons') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { title: 'Kitchen Technologies', slug: 'kitchen-technologies' },
              error: null,
            }),
          }),
          in: vi.fn().mockResolvedValue({
            data: [{ id: LESSON_ID, title: 'Kitchen Technologies', slug: 'kitchen-technologies' }],
            error: null,
          }),
        }),
      } as never
    }
    if (table === 'lesson_submissions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((col: string) => {
            if (col === 'student_id') {
              // Unit review download path: .eq('student_id').eq('lesson_id').in('slide_id')
              return {
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }
            }
            // lesson_id path
            return {
              // MCQ submissions: .eq(lessonId).eq(slideId)
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              // Initial student load + CSV: .eq(lessonId).not('section', ...)
              not: vi.fn().mockResolvedValue({
                data: [{ student_id: 'student-1' }, { student_id: 'student-2' }],
                error: null,
              }),
            }
          }),
        }),
      } as never
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'student-1', display_name: 'Alex Smith' },
              { id: 'student-2', display_name: 'Jordan Lee' },
            ],
            error: null,
          }),
        }),
      } as never
    }
    return {} as never
  })
}

describe('a11y-phase5 — TeacherDashboard with csv and Unit Review buttons', () => {
  beforeEach(() => setupDashboardMock())

  it('has zero critical/serious axe violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/teacher/dashboard/${LESSON_ID}`]}>
        <Routes>
          <Route path="/teacher/dashboard/:lessonId" element={<TeacherDashboard />} />
          <Route path="/auth/signin" element={<div>Sign in</div>} />
          <Route path="/home" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for "Download .csv" button (always visible after load)
    await waitFor(() => expect(screen.getByTestId('download-csv-btn')).toBeInTheDocument())
    // Wait for the student Unit Review buttons to appear
    await waitFor(() => expect(screen.getByTestId('unit-review-btn-student-1')).toBeInTheDocument())
    expect(screen.getByTestId('unit-review-btn-student-2')).toBeInTheDocument()

    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── ReferenceBuilder — Website type ──────────────────────────────────────────

describe('a11y-phase5 — ReferenceBuilder Website type', () => {
  it('has zero critical/serious axe violations', async () => {
    const { container } = render(<ReferenceBuilder onAdd={vi.fn()} />)

    // Website is the default — URL and Accessed fields are visible
    expect(screen.getByLabelText('URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Accessed')).toBeInTheDocument()

    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── ReferenceBuilder — Journal type ──────────────────────────────────────────

describe('a11y-phase5 — ReferenceBuilder Journal type', () => {
  it('has zero critical/serious axe violations with Volume, Issue, and Pages visible', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
    const { container } = render(<ReferenceBuilder onAdd={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('Type'), 'journal')

    // Journal-specific fields should now be visible
    expect(screen.getByLabelText('Volume')).toBeInTheDocument()
    expect(screen.getByLabelText('Issue')).toBeInTheDocument()
    expect(screen.getByLabelText('Pages')).toBeInTheDocument()

    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── References scaffold slide — ReferenceBuilder alongside freeform table ─────

const referencesSlide: Extract<SlideConfig, { type: 'scaffold' }> = {
  id: 'slide-17-references-scaffold',
  type: 'scaffold',
  section: 'references',
  mode: 'freeform-table',
  config: {
    id: 'references',
    targetQuestion: 'List your references in APA 7th edition format.',
    mode: 'freeform-table',
    sectionHeading: 'References',
    template: {
      columns: [{ id: 'reference', label: 'Reference', hint: 'Use APA 7th edition format.' }],
      minRows: 1,
    },
  },
}

describe('a11y-phase5 — References scaffold slide with ReferenceBuilder', () => {
  it('has zero critical/serious axe violations', async () => {
    const state = makeLessonState('test-lesson', [referencesSlide] as SlideConfig[])
    const { container } = render(
      <LessonProvider initialState={state}>
        <SlideScaffold slide={referencesSlide} />
      </LessonProvider>
    )

    // ReferenceBuilder is visible before commit
    expect(screen.getByTestId('reference-builder')).toBeInTheDocument()
    // Freeform table is also present
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toBeInTheDocument()

    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})
