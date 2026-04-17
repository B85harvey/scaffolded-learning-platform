/**
 * LiveWall page tests.
 *
 * Verifies:
 * - Page renders without TeacherNav.
 * - Dark/light theme toggle switches background class.
 * - Escape key triggers exit-fullscreen handler.
 * - Realtime events update a "Waiting…" card to "Response ready" (still hidden),
 *   and revealing it shows the correct paragraph.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LiveWall } from '@/pages/teacher/LiveWall'

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

// Capture realtime callback so we can fire events in tests.
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

const DB_SLIDES = [
  {
    id: 'slide-aim',
    sort_order: 1,
    type: 'scaffold',
    config: { section: 'aim', mode: 'framed' },
  },
  {
    id: 'slide-issues',
    sort_order: 2,
    type: 'scaffold',
    config: { section: 'issues', mode: 'guided' },
  },
  {
    id: 'slide-mcq',
    sort_order: 3,
    type: 'mcq',
    config: { variant: 'class', question: 'What is the main function of a knife in cooking?' },
  },
]

const DB_GROUPS = [
  { id: 'group-1', lesson_id: LESSON_ID, group_name: 'The Chefs' },
  { id: 'group-2', lesson_id: LESSON_ID, group_name: 'Taste Testers' },
]

const DB_GROUP_MEMBERS = [
  { group_id: 'group-1', student_id: 'student-scribe-1', is_scribe: true },
  { group_id: 'group-2', student_id: 'student-scribe-2', is_scribe: true },
]

const DB_SUBMISSIONS = [
  {
    student_id: 'student-scribe-1',
    slide_id: 'slide-aim',
    section: 'aim',
    committed_paragraph: 'The aim is to cook pasta perfectly.',
  },
]

// ── Mock builder ──────────────────────────────────────────────────────────────

function setupFromMock(overrides: { submissions?: typeof DB_SUBMISSIONS } = {}) {
  const submissions = overrides.submissions ?? DB_SUBMISSIONS

  mockFrom.mockImplementation((table: string) => {
    if (table === 'slides') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: DB_SLIDES, error: null }),
          }),
        }),
      } as never
    }
    if (table === 'groups') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: DB_GROUPS, error: null }),
        }),
      } as never
    }
    if (table === 'group_members') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: DB_GROUP_MEMBERS, error: null }),
        }),
      } as never
    }
    if (table === 'lesson_submissions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: submissions, error: null }),
        }),
      } as never
    }
    return {} as never
  })
}

// ── Render helper ─────────────────────────────────────────────────────────────

function renderWall(lessonId = LESSON_ID) {
  return render(
    <MemoryRouter initialEntries={[`/teacher/livewall/${lessonId}`]}>
      <Routes>
        <Route path="/teacher/livewall/:lessonId" element={<LiveWall />} />
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

  // Re-establish channelMock behaviour after vi.clearAllMocks().
  channelMock.on.mockImplementation((_e: string, _f: unknown, cb: (p: unknown) => void) => {
    capturedRealtimeCallback = cb
    return channelMock
  })
  channelMock.subscribe.mockReturnValue(channelMock)

  mockUseAuth.mockReturnValue(TEACHER)
  setupFromMock()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveWall — page structure', () => {
  it('renders the live-wall container', async () => {
    renderWall()
    await waitFor(() => expect(screen.getByTestId('live-wall')).toBeInTheDocument())
  })

  it('renders WITHOUT TeacherNav', async () => {
    renderWall()
    await waitFor(() => screen.getByTestId('live-wall'))
    expect(
      screen.queryByRole('navigation', { name: /teacher navigation/i })
    ).not.toBeInTheDocument()
  })

  it('renders slide selector after loading', async () => {
    renderWall()
    await waitFor(() => screen.getByTestId('slide-selector'))
    // Two scaffold slides + 1 class-check MCQ = 3 buttons.
    expect(screen.getByTestId('slide-btn-slide-aim')).toBeInTheDocument()
    expect(screen.getByTestId('slide-btn-slide-issues')).toBeInTheDocument()
    expect(screen.getByTestId('slide-btn-slide-mcq')).toBeInTheDocument()
  })
})

describe('LiveWall — theme toggle', () => {
  it('defaults to dark mode (dark background class)', async () => {
    // Ensure no stored preference.
    localStorage.removeItem('livewall-theme')
    renderWall()
    await waitFor(() => screen.getByTestId('live-wall'))
    expect(screen.getByTestId('live-wall')).toHaveClass('bg-[#1a1c23]')
  })

  it('clicking theme toggle switches to light mode', async () => {
    localStorage.removeItem('livewall-theme')
    const user = userEvent.setup()
    renderWall()
    await waitFor(() => screen.getByTestId('theme-toggle'))

    await user.click(screen.getByTestId('theme-toggle'))

    expect(screen.getByTestId('live-wall')).toHaveClass('bg-white')
  })

  it('clicking theme toggle twice returns to dark mode', async () => {
    localStorage.removeItem('livewall-theme')
    const user = userEvent.setup()
    renderWall()
    await waitFor(() => screen.getByTestId('theme-toggle'))

    await user.click(screen.getByTestId('theme-toggle'))
    await user.click(screen.getByTestId('theme-toggle'))

    expect(screen.getByTestId('live-wall')).toHaveClass('bg-[#1a1c23]')
  })
})

describe('LiveWall — escape key', () => {
  it('pressing Escape calls document.exitFullscreen when in fullscreen', async () => {
    const exitSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'exitFullscreen', {
      value: exitSpy,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      writable: true,
      configurable: true,
    })

    renderWall()
    await waitFor(() => screen.getByTestId('live-wall'))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(exitSpy).toHaveBeenCalled()

    // Clean up
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    })
  })
})

describe('LiveWall — response cards', () => {
  it('shows committed card as "Response ready" before reveal', async () => {
    renderWall()
    await waitFor(() => screen.getByTestId('card-ready-group-1'))
    expect(screen.getByTestId('card-ready-group-1')).toHaveTextContent(/response ready/i)
  })

  it('shows waiting card for group with no submission', async () => {
    renderWall()
    await waitFor(() => screen.getByTestId('card-waiting-group-2'))
    expect(screen.getByTestId('card-waiting-group-2')).toHaveTextContent(/waiting for response/i)
  })
})

describe('LiveWall — realtime updates', () => {
  it('a realtime INSERT updates "Waiting…" card to "Response ready" (still hidden)', async () => {
    // Start with NO submissions so both cards are waiting.
    setupFromMock({ submissions: [] })

    renderWall()
    await waitFor(() => screen.getByTestId('card-waiting-group-1'))

    // Fire realtime event for group-1's scribe.
    act(() => {
      capturedRealtimeCallback?.({
        new: {
          student_id: 'student-scribe-1',
          lesson_id: LESSON_ID,
          slide_id: 'slide-aim',
          section: 'aim',
          committed_paragraph: 'Realtime paragraph content.',
          committed_at: new Date().toISOString(),
        },
      })
    })

    // Card should now show "Response ready" (still hidden, not revealed).
    await waitFor(() => {
      expect(screen.getByTestId('card-ready-group-1')).toBeInTheDocument()
    })
    // Paragraph not yet visible (hidden).
    expect(screen.queryByTestId('card-paragraph-group-1')).not.toBeInTheDocument()
  })

  it('revealing a realtime-updated card shows the correct paragraph', async () => {
    setupFromMock({ submissions: [] })

    const user = userEvent.setup()
    renderWall()
    await waitFor(() => screen.getByTestId('card-waiting-group-1'))

    // Fire realtime event.
    act(() => {
      capturedRealtimeCallback?.({
        new: {
          student_id: 'student-scribe-1',
          lesson_id: LESSON_ID,
          slide_id: 'slide-aim',
          section: 'aim',
          committed_paragraph: 'Realtime paragraph content.',
          committed_at: new Date().toISOString(),
        },
      })
    })

    await waitFor(() => screen.getByTestId('card-ready-group-1'))

    // Click to reveal the card.
    await user.click(screen.getByTestId('response-card-group-1'))

    expect(screen.getByTestId('card-paragraph-group-1')).toHaveTextContent(
      'Realtime paragraph content.'
    )
  })

  it('a realtime UPDATE to an already-revealed card updates the paragraph text live', async () => {
    const user = userEvent.setup()
    renderWall()
    await waitFor(() => screen.getByTestId('card-ready-group-1'))

    // Reveal group-1.
    await user.click(screen.getByTestId('response-card-group-1'))
    expect(screen.getByTestId('card-paragraph-group-1')).toHaveTextContent(
      'The aim is to cook pasta perfectly.'
    )

    // Realtime UPDATE with new text.
    act(() => {
      capturedRealtimeCallback?.({
        new: {
          student_id: 'student-scribe-1',
          lesson_id: LESSON_ID,
          slide_id: 'slide-aim',
          section: 'aim',
          committed_paragraph: 'Updated paragraph after editing.',
          committed_at: new Date().toISOString(),
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('card-paragraph-group-1')).toHaveTextContent(
        'Updated paragraph after editing.'
      )
    })
  })
})
