/**
 * Axe accessibility smoke tests — Phase 4 pages.
 *
 * Mounts each new teacher page with representative mock data and asserts zero
 * critical/serious axe violations. colour-contrast is skipped because jsdom
 * cannot compute CSS computed styles (all tokens are manually validated against
 * WCAG AA).
 *
 * Pages tested:
 *   LessonEditor     — content slide loaded
 *   LessonEditor     — scaffold slide (framed mode) loaded
 *   TeacherDashboard — MCQ results revealed (McqBarChart visible)
 *   LiveWall         — light theme, scaffold slide, response cards rendered
 *   LiveWall         — dark theme, scaffold slide, response cards rendered
 *   LiveWall         — MCQ slide (McqBarChart rendered)
 *   TeacherLessonsPage — lessons listed
 *   TeacherLessonsPage — empty state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LessonEditor } from '@/pages/teacher/LessonEditor'
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'
import { LiveWall } from '@/pages/teacher/LiveWall'
import { TeacherLessonsPage } from '@/pages/teacher/TeacherLessonsPage'

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
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
  },
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
    // jsdom cannot compute CSS computed styles — all Phase 4 tokens are
    // manually validated against WCAG AA (e.g. ga-primary #4680ff on white).
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
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ── LessonEditor fixtures ─────────────────────────────────────────────────────

const LESSON = { id: 'lesson-a11y', title: 'Kitchen Technologies' }

const CONTENT_SLIDE = {
  id: 'slide-content-1',
  sort_order: 1,
  type: 'content',
  config: {
    id: 'slide-content-1',
    type: 'content',
    section: 'orientation',
    title: 'Introduction to Cooking Methods',
    body: 'Cooking methods determine the final texture and flavour of food.',
  },
}

const SCAFFOLD_SLIDE_FRAMED = {
  id: 'slide-scaffold-1',
  sort_order: 1,
  type: 'scaffold',
  config: {
    id: 'slide-scaffold-1',
    type: 'scaffold',
    section: 'aim',
    mode: 'framed',
    config: {
      prompts: [
        {
          id: 'prompt-1',
          text: 'Purpose',
          frame: 'The aim of this task is {answer} in order to {answer}.',
          hint: 'Think about the specific goal.',
        },
      ],
    },
  },
}

function setupEditorMock(slides: unknown[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lessons') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: LESSON, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as never
    }
    if (table === 'slides') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: slides, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'no insert' } }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as never
    }
    return {} as never
  })
}

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={['/teacher/lessons/lesson-a11y/edit']}>
      <Routes>
        <Route path="/teacher/lessons/:lessonId/edit" element={<LessonEditor />} />
        <Route path="/teacher/lessons" element={<div>Lessons</div>} />
        <Route path="/auth/signin" element={<div>Sign in</div>} />
        <Route path="/home" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── LessonEditor — content slide ─────────────────────────────────────────────

describe('a11y-phase4 — LessonEditor content slide', () => {
  beforeEach(() => setupEditorMock([CONTENT_SLIDE]))

  it('has zero critical/serious axe violations', async () => {
    const { container } = renderEditor()
    await waitFor(() => expect(screen.getByTestId('lesson-editor')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── LessonEditor — scaffold slide (framed mode) ───────────────────────────────

describe('a11y-phase4 — LessonEditor scaffold slide (framed mode)', () => {
  beforeEach(() => setupEditorMock([SCAFFOLD_SLIDE_FRAMED]))

  it('has zero critical/serious axe violations', async () => {
    const { container } = renderEditor()
    await waitFor(() => expect(screen.getByTestId('lesson-editor')).toBeInTheDocument())
    // Wait for scaffold editor to mount
    await waitFor(() => expect(screen.getByTestId('prompt-row-0')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── TeacherDashboard — MCQ results revealed ───────────────────────────────────

describe('a11y-phase4 — TeacherDashboard with McqBarChart visible', () => {
  const MCQ_SLIDE = {
    id: 'mcq-1',
    sort_order: 1,
    type: 'mcq',
    config: {
      question: 'Which cooking method preserves the most nutrients?',
      variant: 'class',
      options: [
        { id: 'opt-a', text: 'Boiling', correct: false },
        { id: 'opt-b', text: 'Steaming', correct: true },
        { id: 'opt-c', text: 'Frying', correct: false },
      ],
    },
  }

  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'slides') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [MCQ_SLIDE], error: null }),
            }),
          }),
        } as never
      }
      if (table === 'lessons') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: { title: 'Kitchen Technologies' }, error: null }),
            }),
          }),
        } as never
      }
      if (table === 'lesson_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    student_id: 'student-1',
                    slide_id: 'mcq-1',
                    prompt_answers: { selectedOption: 'opt-a' },
                  },
                  {
                    student_id: 'student-2',
                    slide_id: 'mcq-1',
                    prompt_answers: { selectedOption: 'opt-b' },
                  },
                  {
                    student_id: 'student-3',
                    slide_id: 'mcq-1',
                    prompt_answers: { selectedOption: 'opt-b' },
                  },
                ],
                error: null,
              }),
              not: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        } as never
      }
      return {} as never
    })
  })

  it('has zero critical/serious axe violations with answers revealed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })

    const { container } = render(
      <MemoryRouter initialEntries={['/teacher/dashboard/lesson-a11y']}>
        <Routes>
          <Route path="/teacher/dashboard/:lessonId" element={<TeacherDashboard />} />
          <Route path="/auth/signin" element={<div>Sign in</div>} />
          <Route path="/home" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByTestId('reveal-btn')).toBeInTheDocument())
    await user.click(screen.getByTestId('reveal-btn'))
    await waitFor(() => expect(screen.getByTestId('mcq-bar-chart')).toBeInTheDocument())

    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── LiveWall fixtures ─────────────────────────────────────────────────────────

const LW_SLIDES = [
  {
    id: 'lw-slide-aim',
    sort_order: 1,
    type: 'scaffold',
    config: { section: 'aim', mode: 'framed' },
  },
  {
    id: 'lw-slide-mcq',
    sort_order: 2,
    type: 'mcq',
    config: {
      variant: 'class',
      question: 'What is the most important food safety rule?',
      options: [
        { id: 'o1', text: 'Hand washing', correct: true },
        { id: 'o2', text: 'Refrigeration', correct: false },
      ],
    },
  },
]

const LW_GROUPS = [
  { id: 'grp-1', lesson_id: 'lesson-a11y', group_name: 'The Chefs' },
  { id: 'grp-2', lesson_id: 'lesson-a11y', group_name: 'Taste Testers' },
]

const LW_MEMBERS = [
  { group_id: 'grp-1', student_id: 'scribe-1', is_scribe: true },
  { group_id: 'grp-2', student_id: 'scribe-2', is_scribe: true },
]

const LW_SUBMISSIONS = [
  {
    student_id: 'scribe-1',
    slide_id: 'lw-slide-aim',
    section: 'aim',
    committed_paragraph: 'The aim is to demonstrate safe food handling.',
    prompt_answers: null,
  },
]

function setupLiveWallMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'slides') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: LW_SLIDES, error: null }),
          }),
        }),
      } as never
    }
    if (table === 'groups') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: LW_GROUPS, error: null }),
        }),
      } as never
    }
    if (table === 'group_members') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: LW_MEMBERS, error: null }),
        }),
      } as never
    }
    if (table === 'lesson_submissions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: LW_SUBMISSIONS, error: null }),
        }),
      } as never
    }
    return {} as never
  })
}

function renderLiveWall() {
  return render(
    <MemoryRouter initialEntries={['/teacher/livewall/lesson-a11y']}>
      <Routes>
        <Route path="/teacher/livewall/:lessonId" element={<LiveWall />} />
        <Route path="/auth/signin" element={<div>Sign in</div>} />
        <Route path="/home" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── LiveWall — light theme, response cards ────────────────────────────────────

describe('a11y-phase4 — LiveWall light theme with response cards', () => {
  beforeEach(() => {
    localStorage.setItem('livewall-theme', 'light')
    setupLiveWallMock()
  })

  it('has zero critical/serious axe violations', async () => {
    const { container } = renderLiveWall()
    // Wait for the response cards to appear (loading complete)
    await waitFor(() => expect(screen.getByTestId('reveal-controls')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('response-card-grp-1')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── LiveWall — dark theme, response cards ─────────────────────────────────────

describe('a11y-phase4 — LiveWall dark theme with response cards', () => {
  beforeEach(() => {
    localStorage.setItem('livewall-theme', 'dark')
    setupLiveWallMock()
  })

  it('has zero critical/serious axe violations', async () => {
    const { container } = renderLiveWall()
    await waitFor(() => expect(screen.getByTestId('reveal-controls')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('response-card-grp-1')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── LiveWall — MCQ slide (McqBarChart) ───────────────────────────────────────

describe('a11y-phase4 — LiveWall with McqBarChart', () => {
  const MCQ_ONLY_SLIDES = [
    {
      id: 'lw-slide-mcq',
      sort_order: 1,
      type: 'mcq',
      config: {
        variant: 'class',
        question: 'What is the most important food safety rule?',
        options: [
          { id: 'o1', text: 'Hand washing', correct: true },
          { id: 'o2', text: 'Refrigeration', correct: false },
        ],
      },
    },
  ]

  const MCQ_SUBMISSIONS = [
    {
      student_id: 'scribe-1',
      slide_id: 'lw-slide-mcq',
      section: null,
      committed_paragraph: null,
      prompt_answers: { selectedOption: 'o1' },
    },
    {
      student_id: 'scribe-2',
      slide_id: 'lw-slide-mcq',
      section: null,
      committed_paragraph: null,
      prompt_answers: { selectedOption: 'o1' },
    },
  ]

  beforeEach(() => {
    localStorage.setItem('livewall-theme', 'dark')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'slides') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: MCQ_ONLY_SLIDES, error: null }),
            }),
          }),
        } as never
      }
      if (table === 'groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: LW_GROUPS, error: null }),
          }),
        } as never
      }
      if (table === 'group_members') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: LW_MEMBERS, error: null }),
          }),
        } as never
      }
      if (table === 'lesson_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: MCQ_SUBMISSIONS, error: null }),
          }),
        } as never
      }
      return {} as never
    })
  })

  it('has zero critical/serious axe violations', async () => {
    const { container } = renderLiveWall()
    // When the first (and only) slide is MCQ, the chart renders immediately.
    await waitFor(() => expect(screen.getByTestId('mcq-bar-chart')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── TeacherLessonsPage — lessons listed ──────────────────────────────────────

describe('a11y-phase4 — TeacherLessonsPage with lessons', () => {
  const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const DB_LESSONS = [{ id: 'lesson-x', title: 'Kitchen Technologies', updated_at: TWO_DAYS_AGO }]
  const DB_SLIDE_ROWS = [{ lesson_id: 'lesson-x' }, { lesson_id: 'lesson-x' }]

  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lessons') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: DB_LESSONS, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as never
      }
      if (table === 'slides') {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'lesson_id') {
              return { in: vi.fn().mockResolvedValue({ data: DB_SLIDE_ROWS, error: null }) }
            }
            return {
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as never
      }
      return {} as never
    })
  })

  it('has zero critical/serious axe violations with a lesson listed', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/teacher/lessons']}>
        <Routes>
          <Route path="/teacher/lessons" element={<TeacherLessonsPage />} />
          <Route path="/teacher/lessons/:id/edit" element={<div>Editor</div>} />
          <Route path="/auth/signin" element={<div>Sign in</div>} />
          <Route path="/home" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByTestId('lessons-table')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

// ── TeacherLessonsPage — empty state ─────────────────────────────────────────

describe('a11y-phase4 — TeacherLessonsPage empty state', () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lessons') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as never
      }
      return {} as never
    })
  })

  it('has zero critical/serious axe violations in the empty state', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/teacher/lessons']}>
        <Routes>
          <Route path="/teacher/lessons" element={<TeacherLessonsPage />} />
          <Route path="/teacher/lessons/:id/edit" element={<div>Editor</div>} />
          <Route path="/auth/signin" element={<div>Sign in</div>} />
          <Route path="/home" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})
