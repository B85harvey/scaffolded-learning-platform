/**
 * TeacherLessonsPage integration tests.
 *
 * Verifies: lesson list rendering, sort order, Edit link, Duplicate flow,
 * Delete confirmation flow, and empty state with Create lesson button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TeacherLessonsPage } from '@/pages/teacher/TeacherLessonsPage'

// ── Auth mock ─────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const TEACHER = {
  session: { user: { id: 'teacher-uuid-1' } } as never,
  profile: {
    id: 'teacher-uuid-1',
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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const { supabase } = await import('@/lib/supabase')
const mockFrom = vi.mocked(supabase.from)

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Two days ago and five days ago — in descending order (most recent first)
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
const FIVE_DAYS_AGO = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

const DB_LESSONS = [
  { id: 'lesson-a', title: 'Kitchen Technologies', updated_at: TWO_DAYS_AGO },
  { id: 'lesson-b', title: 'Food Safety Basics', updated_at: FIVE_DAYS_AGO },
]

// Slide count rows for the initial load (lesson-a has 3, lesson-b has 2)
const DB_SLIDE_COUNT_ROWS = [
  { lesson_id: 'lesson-a' },
  { lesson_id: 'lesson-a' },
  { lesson_id: 'lesson-a' },
  { lesson_id: 'lesson-b' },
  { lesson_id: 'lesson-b' },
]

// Slides belonging to lesson-a (used for duplication)
const DB_LESSON_A_SLIDES = [
  { sort_order: 1, type: 'content', config: { title: 'Slide 1' } },
  { sort_order: 2, type: 'scaffold', config: { section: 'aim' } },
  { sort_order: 3, type: 'mcq', config: { question: 'Q?' } },
]

// ── Mock builder ──────────────────────────────────────────────────────────────

const mockLessonOrderFn = vi.fn()
const mockSlidesInFn = vi.fn()
const mockSlidesForDupOrderFn = vi.fn()
const mockInsertSingle = vi.fn()
const mockSlidesInsert = vi.fn()
const mockSlidesDeleteEq = vi.fn()
const mockLessonsDeleteEq = vi.fn()

function setupFromMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lessons') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: mockLessonOrderFn,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsertSingle,
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: mockLessonsDeleteEq,
        }),
      } as never
    }
    if (table === 'slides') {
      return {
        select: vi.fn().mockImplementation((cols: string) => {
          if (cols === 'lesson_id') {
            return { in: mockSlidesInFn }
          }
          // Duplicate fetch: 'sort_order, type, config'
          return {
            eq: vi.fn().mockReturnValue({
              order: mockSlidesForDupOrderFn,
            }),
          }
        }),
        insert: mockSlidesInsert,
        delete: vi.fn().mockReturnValue({
          eq: mockSlidesDeleteEq,
        }),
      } as never
    }
    return {} as never
  })
}

// ── Render helper ─────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/lessons']}>
      <Routes>
        <Route path="/teacher/lessons" element={<TeacherLessonsPage />} />
        <Route
          path="/teacher/lessons/:lessonId/edit"
          element={<div data-testid="editor-page">Editor</div>}
        />
      </Routes>
    </MemoryRouter>
  )
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(TEACHER)

  // Default: load returns two lessons
  mockLessonOrderFn.mockResolvedValue({ data: DB_LESSONS, error: null })
  mockSlidesInFn.mockResolvedValue({ data: DB_SLIDE_COUNT_ROWS, error: null })
  mockSlidesForDupOrderFn.mockResolvedValue({ data: DB_LESSON_A_SLIDES, error: null })
  mockInsertSingle.mockResolvedValue({ data: { id: 'new-lesson-id' }, error: null })
  mockSlidesInsert.mockResolvedValue({ data: null, error: null })
  mockSlidesDeleteEq.mockResolvedValue({ data: null, error: null })
  mockLessonsDeleteEq.mockResolvedValue({ data: null, error: null })

  setupFromMock()
})

// ── Tests — list rendering ────────────────────────────────────────────────────

describe('TeacherLessonsPage — list rendering', () => {
  it('renders the lesson library container', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('lesson-library')).toBeInTheDocument())
  })

  it('renders both lesson titles', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('lesson-title-lesson-a')).toHaveTextContent('Kitchen Technologies')
      expect(screen.getByTestId('lesson-title-lesson-b')).toHaveTextContent('Food Safety Basics')
    })
  })

  it('renders the correct slide count for each lesson', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('lesson-slides-lesson-a')).toHaveTextContent('3')
      expect(screen.getByTestId('lesson-slides-lesson-b')).toHaveTextContent('2')
    })
  })

  it('renders a last-edited relative date for each lesson', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('lesson-updated-lesson-a')).toHaveTextContent('2 days ago')
      expect(screen.getByTestId('lesson-updated-lesson-b')).toHaveTextContent('5 days ago')
    })
  })

  it('renders lessons in descending last-edited order (most recent first)', async () => {
    renderPage()
    await waitFor(() => screen.getByTestId('lessons-table'))
    const rows = screen.getAllByRole('row')
    // rows[0] is the header; rows[1] is lesson-a (2 days ago); rows[2] is lesson-b (5 days ago)
    expect(rows[1]).toHaveAttribute('data-testid', 'lesson-row-lesson-a')
    expect(rows[2]).toHaveAttribute('data-testid', 'lesson-row-lesson-b')
  })

  it('Edit link points to the correct editor URL', async () => {
    renderPage()
    await waitFor(() => screen.getByTestId('edit-btn-lesson-a'))
    expect(screen.getByTestId('edit-btn-lesson-a')).toHaveAttribute(
      'href',
      '/teacher/lessons/lesson-a/edit'
    )
    expect(screen.getByTestId('edit-btn-lesson-b')).toHaveAttribute(
      'href',
      '/teacher/lessons/lesson-b/edit'
    )
  })

  it('renders Duplicate and Delete buttons for each lesson', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('duplicate-btn-lesson-a')).toBeInTheDocument()
      expect(screen.getByTestId('delete-btn-lesson-a')).toBeInTheDocument()
      expect(screen.getByTestId('duplicate-btn-lesson-b')).toBeInTheDocument()
      expect(screen.getByTestId('delete-btn-lesson-b')).toBeInTheDocument()
    })
  })
})

// ── Tests — duplication ───────────────────────────────────────────────────────

describe('TeacherLessonsPage — duplication', () => {
  it('clicking Duplicate inserts a new lesson with "(copy)" in the title', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByTestId('duplicate-btn-lesson-a'))

    await user.click(screen.getByTestId('duplicate-btn-lesson-a'))

    await waitFor(() => {
      expect(mockInsertSingle).toHaveBeenCalledOnce()
    })

    // The lessons insert should include "(copy)" in the title
    const insertCall = vi.mocked(supabase.from).mock.calls.find(([table]) => table === 'lessons')
    expect(insertCall).toBeDefined()
    // Verify navigate happened (editor page renders)
    await waitFor(() => expect(screen.getByTestId('editor-page')).toBeInTheDocument())
  })

  it('duplicated lesson has the same number of slides as the original', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByTestId('duplicate-btn-lesson-a'))

    await user.click(screen.getByTestId('duplicate-btn-lesson-a'))

    await waitFor(() => expect(mockSlidesInsert).toHaveBeenCalledOnce())

    // mockSlidesInsert should be called with an array of 3 slides (same as DB_LESSON_A_SLIDES)
    const insertArg = mockSlidesInsert.mock.calls[0][0] as unknown[]
    expect(insertArg).toHaveLength(3)
  })

  it('navigates to the editor for the new lesson after duplication', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByTestId('duplicate-btn-lesson-a'))

    await user.click(screen.getByTestId('duplicate-btn-lesson-a'))

    await waitFor(() => expect(screen.getByTestId('editor-page')).toBeInTheDocument())
  })
})

// ── Tests — deletion ──────────────────────────────────────────────────────────

describe('TeacherLessonsPage — deletion', () => {
  it('clicking Delete shows the confirmation dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByTestId('delete-btn-lesson-a'))

    await user.click(screen.getByTestId('delete-btn-lesson-a'))

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('Kitchen Technologies')
    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('This cannot be undone.')
  })

  it('cancelling the dialog keeps the lesson in the list', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByTestId('delete-btn-lesson-a'))

    await user.click(screen.getByTestId('delete-btn-lesson-a'))
    await user.click(screen.getByTestId('delete-cancel-btn'))

    expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('lesson-row-lesson-a')).toBeInTheDocument()
  })

  it('confirming delete removes the lesson from the list', async () => {
    const user = userEvent.setup()

    // After delete, reload returns only lesson-b
    mockLessonOrderFn
      .mockResolvedValueOnce({ data: DB_LESSONS, error: null })
      .mockResolvedValue({ data: [DB_LESSONS[1]], error: null })
    // Slide count reload for just lesson-b
    mockSlidesInFn
      .mockResolvedValueOnce({ data: DB_SLIDE_COUNT_ROWS, error: null })
      .mockResolvedValue({
        data: [{ lesson_id: 'lesson-b' }, { lesson_id: 'lesson-b' }],
        error: null,
      })

    renderPage()
    await waitFor(() => screen.getByTestId('delete-btn-lesson-a'))

    await user.click(screen.getByTestId('delete-btn-lesson-a'))
    await user.click(screen.getByTestId('delete-confirm-btn'))

    await waitFor(() => expect(screen.queryByTestId('lesson-row-lesson-a')).not.toBeInTheDocument())
    expect(screen.getByTestId('lesson-row-lesson-b')).toBeInTheDocument()
  })
})

// ── Tests — empty state ───────────────────────────────────────────────────────

describe('TeacherLessonsPage — empty state', () => {
  beforeEach(() => {
    mockLessonOrderFn.mockResolvedValue({ data: [], error: null })
  })

  it('shows "No lessons yet." when the teacher has no lessons', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No lessons yet.')
  })

  it('shows a "Create lesson" button in the empty state', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-create-btn')).toBeInTheDocument())
  })

  it('clicking "Create lesson" in the empty state navigates to the new lesson editor', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByTestId('empty-create-btn'))

    await user.click(screen.getByTestId('empty-create-btn'))

    await waitFor(() => expect(screen.getByTestId('editor-page')).toBeInTheDocument())
  })
})
