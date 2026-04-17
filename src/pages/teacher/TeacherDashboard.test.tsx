/**
 * TeacherDashboard integration tests.
 *
 * Verifies:
 * - Slide selector renders class-check MCQ slides.
 * - McqBarChart appears with correct data after the teacher reveals answers.
 * - Realtime submission updates re-render the chart with updated counts.
 * - "Download .csv" button calls generateLessonCsv and triggerDownload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'

// ── Utility mocks ─────────────────────────────────────────────────────────────

vi.mock('@/utils/generateLessonCsv', () => ({
  generateLessonCsv: vi
    .fn()
    .mockReturnValue('"Student Name","Aim: Statement of intent"\n"Alex","The aim."'),
}))

vi.mock('@/utils/triggerDownload', () => ({
  triggerDocxDownload: vi.fn(),
}))

vi.mock('@/utils/generateUnitReviewDocx', () => ({
  generateUnitReviewDocx: vi.fn().mockResolvedValue(
    new Blob(['docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  ),
}))

const { generateLessonCsv } = await import('@/utils/generateLessonCsv')
const { triggerDocxDownload } = await import('@/utils/triggerDownload')
const { generateUnitReviewDocx } = await import('@/utils/generateUnitReviewDocx')
const mockGenerateLessonCsv = vi.mocked(generateLessonCsv)
const mockTriggerDocxDownload = vi.mocked(triggerDocxDownload)
const mockGenerateUnitReviewDocx = vi.mocked(generateUnitReviewDocx)

// ── Auth mock ─────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

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

// ── Supabase mock ─────────────────────────────────────────────────────────────

let capturedRealtimeCallback: ((payload: unknown) => void) | null = null

const { channelMock } = vi.hoisted(() => {
  const mock = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  return { channelMock: mock }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue(channelMock),
    removeChannel: vi.fn(),
  },
}))

const { supabase } = await import('@/lib/supabase')
const mockFrom = vi.mocked(supabase.from)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LESSON_ID = 'lesson-uuid-1'

const MCQ_SLIDE = {
  id: 'mcq-slide-1',
  sort_order: 1,
  type: 'mcq',
  config: {
    question: 'What is the main function of a knife in cooking?',
    variant: 'class',
    options: [
      { id: 'opt-a', text: 'Cutting', correct: false },
      { id: 'opt-b', text: 'Mixing', correct: false },
      { id: 'opt-c', text: 'Chopping', correct: true },
    ],
  },
}

const SCAFFOLD_SLIDE = {
  id: 'scaffold-slide-1',
  sort_order: 3,
  type: 'scaffold',
  config: {
    section: 'aim',
    mode: 'framed',
    config: { targetQuestion: 'Statement of intent', mode: 'framed', id: 'cfg-1' },
  },
}

const DB_SLIDES = [
  MCQ_SLIDE,
  // Non-class-check MCQ (self) — should NOT appear in selector
  {
    id: 'mcq-slide-self',
    sort_order: 2,
    type: 'mcq',
    config: {
      question: 'Self-check question?',
      variant: 'self',
      options: [{ id: 'opt-x', text: 'Yes', correct: true }],
    },
  },
  // Scaffold slide — should NOT appear in MCQ selector
  SCAFFOLD_SLIDE,
]

// Scaffold submissions for CSV download test
const DB_SCAFFOLD_SUBMISSIONS = [
  {
    student_id: 'student-1',
    slide_id: 'scaffold-slide-1',
    committed_paragraph: 'The aim is to investigate kitchen technologies.',
    section: 'aim',
  },
  {
    student_id: 'student-2',
    slide_id: 'scaffold-slide-1',
    committed_paragraph: 'To explore modern cooking techniques.',
    section: 'aim',
  },
]

// Profiles for the students in DB_SCAFFOLD_SUBMISSIONS
const DB_PROFILES = [
  { id: 'student-1', display_name: 'Alex Smith' },
  { id: 'student-2', display_name: 'Jordan Lee' },
]

const DB_SUBMISSIONS = [
  // 1 vote for Cutting (opt-a), 2 votes for Chopping (opt-c)
  { student_id: 'student-1', slide_id: 'mcq-slide-1', prompt_answers: { selectedOption: 'opt-a' } },
  { student_id: 'student-2', slide_id: 'mcq-slide-1', prompt_answers: { selectedOption: 'opt-c' } },
  { student_id: 'student-3', slide_id: 'mcq-slide-1', prompt_answers: { selectedOption: 'opt-c' } },
]

// ── Mock builder ──────────────────────────────────────────────────────────────

const mockScaffoldSubmissionsNotFn = vi.fn()
const mockProfilesInFn = vi.fn()
const mockLessonsInFn = vi.fn()
const mockUnitReviewSubmissionInFn = vi.fn()

const DB_UNIT_REVIEW_SUBMISSIONS = [
  {
    slide_id: 'scaffold-slide-1',
    committed_paragraph: 'The aim is to investigate kitchen technologies.',
  },
]

const DB_UNIT_REVIEW_LESSONS = [
  { id: LESSON_ID, title: 'Kitchen Technologies', slug: 'kitchen-technologies' },
]

function setupFromMock(overrides: { submissions?: typeof DB_SUBMISSIONS } = {}) {
  const submissions = overrides.submissions ?? DB_SUBMISSIONS

  // Reset CSV/unit-review-path mocks to defaults
  mockScaffoldSubmissionsNotFn.mockResolvedValue({ data: DB_SCAFFOLD_SUBMISSIONS, error: null })
  mockProfilesInFn.mockResolvedValue({ data: DB_PROFILES, error: null })
  mockLessonsInFn.mockResolvedValue({ data: DB_UNIT_REVIEW_LESSONS, error: null })
  mockUnitReviewSubmissionInFn.mockResolvedValue({
    data: DB_UNIT_REVIEW_SUBMISSIONS,
    error: null,
  })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'slides') {
      // Scaffold-only query (unit review download): .eq(lesson_id).eq('type', 'scaffold').order(...)
      const scaffoldOrderFn = vi.fn().mockResolvedValue({ data: [SCAFFOLD_SLIDE], error: null })
      // All-slides query (initial load): .eq(lesson_id).order(...)
      const allSlidesOrderFn = vi.fn().mockResolvedValue({ data: DB_SLIDES, error: null })
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
          in: mockLessonsInFn,
        }),
      } as never
    }
    if (table === 'lesson_submissions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((col: string) => {
            if (col === 'student_id') {
              // Unit review download path: .eq('student_id').eq('lesson_id').in('slide_id', ...)
              return {
                eq: vi.fn().mockReturnValue({
                  in: mockUnitReviewSubmissionInFn,
                }),
              }
            }
            // lesson_id path (MCQ, CSV, initial student load)
            return {
              // MCQ: .eq(lessonId).eq(slideId)
              eq: vi.fn().mockResolvedValue({ data: submissions, error: null }),
              // CSV + initial load: .eq(lessonId).not('section', ...)
              not: mockScaffoldSubmissionsNotFn,
            }
          }),
        }),
      } as never
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          in: mockProfilesInFn,
        }),
      } as never
    }
    return {} as never
  })
}

// ── Render helper ─────────────────────────────────────────────────────────────

function renderDashboard(lessonId = LESSON_ID) {
  return render(
    <MemoryRouter initialEntries={[`/teacher/dashboard/${lessonId}`]}>
      <Routes>
        <Route path="/teacher/dashboard/:lessonId" element={<TeacherDashboard />} />
        <Route path="/auth/signin" element={<div>Sign in</div>} />
        <Route path="/home" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  capturedRealtimeCallback = null

  // Restore CSV utility mock defaults after clearAllMocks
  mockGenerateLessonCsv.mockReturnValue(
    '"Student Name","Aim: Statement of intent"\n"Alex","The aim."'
  )
  // Restore unit-review docx mock default after clearAllMocks
  mockGenerateUnitReviewDocx.mockResolvedValue(
    new Blob(['docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  )

  channelMock.on.mockImplementation((_e: string, _f: unknown, cb: (p: unknown) => void) => {
    capturedRealtimeCallback = cb
    return channelMock
  })
  channelMock.subscribe.mockReturnValue(channelMock)

  mockUseAuth.mockReturnValue(TEACHER)
  setupFromMock()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TeacherDashboard — page structure', () => {
  it('renders the dashboard container', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('teacher-dashboard')).toBeInTheDocument())
  })

  it('renders only class-check MCQ slides in the selector', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('mcq-slide-selector'))
    // Only the class-check MCQ slide should appear
    expect(screen.getByTestId('mcq-slide-btn-mcq-slide-1')).toBeInTheDocument()
    // Self-check MCQ and scaffold should NOT appear
    expect(screen.queryByTestId('mcq-slide-btn-mcq-slide-self')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mcq-slide-btn-scaffold-slide-1')).not.toBeInTheDocument()
  })

  it('auto-selects the first slide and marks it as pressed', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('mcq-slide-btn-mcq-slide-1'))
    expect(screen.getByTestId('mcq-slide-btn-mcq-slide-1')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the question for the selected slide', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('mcq-question'))
    expect(screen.getByTestId('mcq-question')).toHaveTextContent(
      'What is the main function of a knife in cooking?'
    )
  })

  it('shows an empty state when no class-check slides exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'slides') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
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
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as never
      }
      if (table === 'lesson_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        } as never
      }
      return {} as never
    })
    renderDashboard()
    await waitFor(() =>
      expect(screen.getByText(/no class-check slides found/i)).toBeInTheDocument()
    )
  })
})

describe('TeacherDashboard — bar chart', () => {
  it('does not show the chart before the teacher reveals', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))
    expect(screen.queryByTestId('mcq-bar-chart')).not.toBeInTheDocument()
  })

  it('shows reveal button before revealing', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('reveal-btn')).toBeInTheDocument())
  })

  it('clicking reveal shows the McqBarChart', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    expect(screen.getByTestId('mcq-bar-chart')).toBeInTheDocument()
  })

  it('chart displays correct counts from submissions', async () => {
    // Submissions: opt-a=1, opt-b=0, opt-c=2, total=3
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    // opt-a: 1 (33%), opt-b: 0 (0%), opt-c: 2 (67%)
    expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('1 (33%)')
    expect(screen.getByTestId('mcq-label-1')).toHaveTextContent('0 (0%)')
    expect(screen.getByTestId('mcq-label-2')).toHaveTextContent('2 (67%)')
  })

  it('correct option bar uses success class', async () => {
    // correctIndex=2 (opt-c, correct: true)
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    expect(screen.getByTestId('mcq-bar-2')).toHaveClass('bg-ga-green')
    expect(screen.getByTestId('mcq-bar-0')).not.toHaveClass('bg-ga-green')
  })

  it('shows empty state when no submissions exist', async () => {
    setupFromMock({ submissions: [] })
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    expect(screen.getByTestId('mcq-chart-empty')).toBeInTheDocument()
    expect(screen.getByTestId('mcq-chart-empty')).toHaveTextContent('No responses yet.')
  })

  it('clicking hide removes the chart', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))
    expect(screen.getByTestId('mcq-bar-chart')).toBeInTheDocument()

    await user.click(screen.getByTestId('hide-btn'))
    expect(screen.queryByTestId('mcq-bar-chart')).not.toBeInTheDocument()
  })
})

describe('TeacherDashboard — realtime updates', () => {
  it('a realtime INSERT updates the chart counts', async () => {
    setupFromMock({ submissions: [] })
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    // Initially no submissions → empty state
    expect(screen.getByTestId('mcq-chart-empty')).toBeInTheDocument()

    // Fire realtime INSERT for a new submission
    act(() => {
      capturedRealtimeCallback?.({
        new: {
          student_id: 'student-new',
          lesson_id: LESSON_ID,
          slide_id: 'mcq-slide-1',
          prompt_answers: { selectedOption: 'opt-c' },
        },
      })
    })

    // Chart should now appear with 1 vote for opt-c
    await waitFor(() => {
      expect(screen.queryByTestId('mcq-chart-empty')).not.toBeInTheDocument()
      expect(screen.getByTestId('mcq-bar-chart')).toBeInTheDocument()
    })
    expect(screen.getByTestId('mcq-label-2')).toHaveTextContent('1 (100%)')
  })

  it('a realtime UPDATE to an existing submission updates the counts', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    // Initial: opt-a=1, opt-b=0, opt-c=2
    expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('1 (33%)')

    // student-1 changes their answer from opt-a to opt-b
    act(() => {
      capturedRealtimeCallback?.({
        new: {
          student_id: 'student-1',
          lesson_id: LESSON_ID,
          slide_id: 'mcq-slide-1',
          prompt_answers: { selectedOption: 'opt-b' },
        },
      })
    })

    // opt-a=0, opt-b=1, opt-c=2
    await waitFor(() => {
      expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('0 (0%)')
      expect(screen.getByTestId('mcq-label-1')).toHaveTextContent('1 (33%)')
    })
  })

  it('realtime events for a different slide are ignored', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('reveal-btn'))

    await user.click(screen.getByTestId('reveal-btn'))

    // Baseline
    expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('1 (33%)')

    // Event for a DIFFERENT slide
    act(() => {
      capturedRealtimeCallback?.({
        new: {
          student_id: 'student-new',
          lesson_id: LESSON_ID,
          slide_id: 'some-other-slide',
          prompt_answers: { selectedOption: 'opt-a' },
        },
      })
    })

    // Counts should be unchanged
    await waitFor(() => {
      expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('1 (33%)')
    })
  })
})

// ── Tests — CSV download ──────────────────────────────────────────────────────

describe('TeacherDashboard — Download .csv', () => {
  it('renders the "Download .csv" button', async () => {
    renderDashboard()
    await waitFor(() => expect(screen.getByTestId('download-csv-btn')).toBeInTheDocument())
  })

  it('clicking "Download .csv" calls generateLessonCsv with scaffold submissions', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('download-csv-btn'))

    await user.click(screen.getByTestId('download-csv-btn'))

    await waitFor(() => expect(mockGenerateLessonCsv).toHaveBeenCalledOnce())

    const call = mockGenerateLessonCsv.mock.calls[0][0]
    // lessonTitle should come from the lessons table query
    expect(call.lessonTitle).toBe('Kitchen Technologies')
    // students should reflect the two scaffold submissions
    expect(call.students).toHaveLength(2)
    // scaffoldColumns should include the scaffold slide with its label
    expect(call.scaffoldColumns).toHaveLength(1)
    expect(call.scaffoldColumns[0].slideId).toBe('scaffold-slide-1')
    expect(call.scaffoldColumns[0].label).toContain('aim')
  })

  it('clicking "Download .csv" calls triggerDocxDownload with correct filename', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('download-csv-btn'))

    await user.click(screen.getByTestId('download-csv-btn'))

    await waitFor(() => expect(mockTriggerDocxDownload).toHaveBeenCalledOnce())

    const [blob, filename] = mockTriggerDocxDownload.mock.calls[0]
    expect((blob as Blob).type).toBe('text/csv')
    expect(filename).toBe('Kitchen Technologies - Class Responses.csv')
  })
})

// ── Tests — Unit Review download ──────────────────────────────────────────────

describe('TeacherDashboard — Unit Review download', () => {
  it('renders a "Download Unit Review" button for each student', async () => {
    renderDashboard()
    await waitFor(() => screen.getByTestId('unit-review-btn-student-1'))
    expect(screen.getByTestId('unit-review-btn-student-1')).toBeInTheDocument()
    expect(screen.getByTestId('unit-review-btn-student-2')).toBeInTheDocument()
  })

  it('clicking "Download Unit Review" calls generateUnitReviewDocx with correct data', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('unit-review-btn-student-1'))

    await user.click(screen.getByTestId('unit-review-btn-student-1'))

    await waitFor(() => expect(mockGenerateUnitReviewDocx).toHaveBeenCalledOnce())

    const call = mockGenerateUnitReviewDocx.mock.calls[0][0]
    expect(call.unitTitle).toBe('Unit 2: Food and Hospitality')
    expect(call.studentName).toBe('Alex Smith')
    expect(call.lessons).toHaveLength(1)
    expect(call.lessons[0].lessonTitle).toBe('Kitchen Technologies')
  })

  it('clicking "Download Unit Review" calls triggerDocxDownload with correct filename', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await waitFor(() => screen.getByTestId('unit-review-btn-student-1'))

    await user.click(screen.getByTestId('unit-review-btn-student-1'))

    await waitFor(() => expect(mockTriggerDocxDownload).toHaveBeenCalledOnce())

    const [blob, filename] = mockTriggerDocxDownload.mock.calls[0]
    expect((blob as Blob).type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(filename).toBe('Unit 2- Food and Hospitality - Alex Smith - Unit Review.docx')
  })
})
