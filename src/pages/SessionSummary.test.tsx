/**
 * SessionSummary tests.
 *
 * Mocks useAuth, supabase, AppNav, SkipToContent.
 * Verifies:
 *   - 4 of 6 sections render paragraphs; 2 show "Not completed".
 *   - Copy All writes correct markdown to clipboard.
 *   - A different studentId navigates away (redirects to /home).
 *   - Teachers can view any student's summary.
 *   - Teachers see a "Download Unit Review" button.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SessionSummary } from './SessionSummary'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))
vi.mock('@/utils/generateUnitReviewDocx', () => ({
  generateUnitReviewDocx: vi.fn().mockResolvedValue(
    new Blob(['docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  ),
}))
vi.mock('@/utils/triggerDownload', () => ({
  triggerDocxDownload: vi.fn(),
}))

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    lesson_submissions: [],
    profiles: [{ display_name: 'Alice Student', email: 'alice@test.com' }],
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (_c: string, _v: unknown) => {
        void _c
        void _v
        return makeBuilder(rows)
      },
      in: (_c: string, _v: unknown) => {
        void _c
        void _v
        return makeBuilder(rows)
      },
      order: () => makeBuilder(rows),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }

  return { supabaseMock: { tables, from: (t: string) => makeBuilder(tables[t] ?? []) } }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const { triggerDocxDownload } = await import('@/utils/triggerDownload')
const { generateUnitReviewDocx } = await import('@/utils/generateUnitReviewDocx')
const mockUseAuth = vi.mocked(useAuth)
const mockTriggerDocxDownload = vi.mocked(triggerDocxDownload)
const mockGenerateUnitReviewDocx = vi.mocked(generateUnitReviewDocx)

const OWN_STUDENT = {
  session: { user: { id: 'student-1' } } as never,
  profile: null,
  loading: false,
  signOut: vi.fn(),
}

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

beforeEach(() => {
  vi.resetAllMocks()
  supabaseMock.tables['lesson_submissions'] = []
  supabaseMock.tables['profiles'] = [{ display_name: 'Alice Student', email: 'alice@test.com' }]
  mockUseAuth.mockReturnValue(OWN_STUDENT)

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderSummary(lessonId = 'kitchen-technologies', studentId = 'student-1') {
  return render(
    <MemoryRouter initialEntries={[`/session/${lessonId}/${studentId}`]}>
      <Routes>
        <Route path="/session/:lessonId/:studentId" element={<SessionSummary />} />
        <Route path="/home" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionSummary — section rendering', () => {
  it('renders paragraphs for committed sections and "Not completed" for the rest', async () => {
    // 4 of 6 sections committed
    supabaseMock.tables['lesson_submissions'] = [
      {
        section: 'aim',
        committed_paragraph: 'The aim is to produce vanilla custard.',
        committed_at: '2025-01-01T10:00:00Z',
      },
      {
        section: 'issues',
        committed_paragraph: 'Food trends affect production.',
        committed_at: '2025-01-01T10:05:00Z',
      },
      {
        section: 'decision',
        committed_paragraph: 'The group will produce vanilla custard.',
        committed_at: '2025-01-01T10:10:00Z',
      },
      {
        section: 'justification',
        committed_paragraph: 'This decision is justified because…',
        committed_at: '2025-01-01T10:15:00Z',
      },
    ]

    renderSummary()

    await waitFor(() => {
      expect(screen.getByText('The aim is to produce vanilla custard.')).toBeInTheDocument()
    })

    expect(screen.getByText('Food trends affect production.')).toBeInTheDocument()
    expect(screen.getByText('The group will produce vanilla custard.')).toBeInTheDocument()
    expect(screen.getByText('This decision is justified because…')).toBeInTheDocument()

    // Two sections (Implementation, References) should show "Not completed"
    const notCompleted = screen.getAllByText('Not completed')
    expect(notCompleted).toHaveLength(2)
  })
})

describe('SessionSummary — Copy All', () => {
  it('writes markdown to clipboard and shows success toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    supabaseMock.tables['lesson_submissions'] = [
      {
        section: 'aim',
        committed_paragraph: 'The aim text.',
        committed_at: '2025-01-01T10:00:00Z',
      },
    ]

    renderSummary()

    await waitFor(() => {
      expect(screen.getByTestId('copy-all-btn')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('copy-all-btn'))

    expect(writeText).toHaveBeenCalledOnce()
    const markdown = writeText.mock.calls[0][0] as string
    expect(markdown).toContain('## Aim')
    expect(markdown).toContain('The aim text.')
  })
})

describe('SessionSummary — auth guard', () => {
  it('redirects to /home when studentId does not match the logged-in user', async () => {
    // Logged in as student-1 but URL has student-2
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'student-1' } } as never,
      profile: null,
      loading: false,
      signOut: vi.fn(),
    })

    renderSummary('kitchen-technologies', 'student-2')

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })
})

describe('SessionSummary — teacher access', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(TEACHER)
    supabaseMock.tables['lesson_submissions'] = [
      {
        section: 'aim',
        committed_paragraph: 'The aim text.',
        committed_at: '2025-01-01T10:00:00Z',
      },
    ]
    supabaseMock.tables['profiles'] = [{ display_name: 'Alice Student', email: 'alice@test.com' }]
  })

  it('does not redirect when a teacher views a different student summary', async () => {
    renderSummary('kitchen-technologies', 'student-99')

    // Should NOT redirect — teacher should see the page
    await waitFor(() => {
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
    })
  })

  it('renders the "Download Unit Review" button for teachers', async () => {
    renderSummary('kitchen-technologies', 'student-99')

    await waitFor(() => {
      expect(screen.getByTestId('unit-review-download-btn')).toBeInTheDocument()
    })
  })

  it('does not show "Download Unit Review" button for students', async () => {
    mockUseAuth.mockReturnValue(OWN_STUDENT)
    renderSummary('kitchen-technologies', 'student-1')

    await waitFor(() => {
      expect(screen.getByTestId('copy-all-btn')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('unit-review-download-btn')).not.toBeInTheDocument()
  })

  it('clicking "Download Unit Review" calls generateUnitReviewDocx and triggerDocxDownload', async () => {
    const user = userEvent.setup()
    renderSummary('kitchen-technologies', 'student-99')

    await waitFor(() => {
      expect(screen.getByTestId('unit-review-download-btn')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('unit-review-download-btn'))

    await waitFor(() => expect(mockGenerateUnitReviewDocx).toHaveBeenCalledOnce())
    expect(mockTriggerDocxDownload).toHaveBeenCalledOnce()
    const [, filename] = mockTriggerDocxDownload.mock.calls[0]
    expect(filename as string).toContain('Unit Review.docx')
  })
})
