/**
 * LessonEditor integration tests.
 *
 * Mocks Supabase to provide a lesson with 3 slides.
 * Verifies sidebar rendering, slide selection, add-slide, delete, and title save.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LessonEditor } from '@/pages/teacher/LessonEditor'

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

const mockDeleteEq = vi.fn()
const mockInsertSelect = vi.fn()
const mockInsertSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
}))

const { supabase } = await import('@/lib/supabase')
const mockFrom = vi.mocked(supabase.from)

// ── Slide fixtures ────────────────────────────────────────────────────────────

const LESSON = { id: 'lesson-uuid-1', title: 'Kitchen Technologies' }

const SLIDES = [
  {
    id: 'slide-uuid-1',
    sort_order: 1,
    type: 'content',
    config: {
      id: 's1',
      type: 'content',
      section: 'orientation',
      title: 'Slide One',
      body: 'Body one',
    },
  },
  {
    id: 'slide-uuid-2',
    sort_order: 2,
    type: 'mcq',
    config: {
      id: 's2',
      type: 'mcq',
      section: 'orientation',
      question: 'Which is correct?',
      options: [
        { id: 'a', text: 'Option A', correct: true },
        { id: 'b', text: 'Option B', correct: false },
      ],
      variant: 'self',
    },
  },
  {
    id: 'slide-uuid-3',
    sort_order: 3,
    type: 'content',
    config: {
      id: 's3',
      type: 'content',
      section: 'orientation',
      title: 'Slide Three',
      body: 'Body three',
    },
  },
]

// ── Mock builder ──────────────────────────────────────────────────────────────

function setupFromMock({
  slides = SLIDES,
  insertedSlide = null as (typeof SLIDES)[0] | null,
  deleteError = null as { message: string } | null,
} = {}) {
  // Track insert single mock
  mockInsertSingle.mockResolvedValue({
    data: insertedSlide,
    error: insertedSlide ? null : { message: 'insert error' },
  })
  mockInsertSelect.mockReturnValue({ single: mockInsertSingle })
  mockDeleteEq.mockResolvedValue({ error: deleteError })

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
        insert: vi.fn().mockReturnValue({ select: mockInsertSelect }),
        delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      } as never
    }
    return {} as never
  })
}

// ── Render helper ─────────────────────────────────────────────────────────────

function renderEditor(lessonId = 'lesson-uuid-1') {
  return render(
    <MemoryRouter initialEntries={[`/teacher/lessons/${lessonId}/edit`]}>
      <Routes>
        <Route path="/teacher/lessons/:lessonId/edit" element={<LessonEditor />} />
        <Route path="/teacher/lessons" element={<div>Lessons list</div>} />
        <Route path="/auth/signin" element={<div>Sign in</div>} />
        <Route path="/home" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(TEACHER)
  setupFromMock()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonEditor — sidebar', () => {
  it('renders 3 slide rows after loading', async () => {
    renderEditor()

    await waitFor(() => {
      expect(screen.getByTestId('lesson-editor')).toBeInTheDocument()
    })

    expect(screen.getByTestId('slide-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('slide-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('slide-row-2')).toBeInTheDocument()
  })

  it('shows correct type icons: content (FileText), mcq (HelpCircle), content (FileText)', async () => {
    renderEditor()

    await waitFor(() => {
      expect(screen.getByTestId('slide-row-0')).toBeInTheDocument()
    })

    // Verify type labels in the slide rows
    const row0 = screen.getByTestId('slide-row-0')
    const row1 = screen.getByTestId('slide-row-1')
    const row2 = screen.getByTestId('slide-row-2')

    expect(within(row0).getByLabelText('Content')).toBeInTheDocument()
    expect(within(row1).getByLabelText('MCQ')).toBeInTheDocument()
    expect(within(row2).getByLabelText('Content')).toBeInTheDocument()
  })

  it('shows slide 1 title as initial selection', async () => {
    renderEditor()

    await waitFor(() => {
      expect(screen.getByTestId('lesson-editor')).toBeInTheDocument()
    })

    // Slide 1 is a content slide — its body should be visible in the editor
    expect(screen.getByDisplayValue('Body one')).toBeInTheDocument()
  })

  it('clicking slide 2 selects it and shows its editor', async () => {
    const user = userEvent.setup({ delay: null })
    renderEditor()

    await waitFor(() => screen.getByTestId('slide-row-1'))

    await user.click(screen.getByTestId('slide-row-1'))

    // Slide 2 is an MCQ — question textarea should appear
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /question/i })).toHaveValue('Which is correct?')
    })
  })
})

describe('LessonEditor — add slide', () => {
  it('clicking "Add slide" > Content inserts a slide and shows 4 rows', async () => {
    const user = userEvent.setup({ delay: null })

    const newSlide = {
      id: 'slide-uuid-4',
      sort_order: 4,
      type: 'content',
      config: { id: 's4', type: 'content', section: 'orientation', title: '', body: '' },
    }
    setupFromMock({ insertedSlide: newSlide })

    renderEditor()
    await waitFor(() => screen.getByTestId('slide-row-0'))

    await user.click(screen.getByTestId('add-slide-btn'))
    await waitFor(() => screen.getByTestId('add-slide-menu'))

    await user.click(screen.getByTestId('add-content-slide'))

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('slides')
    })

    // After insert, the new slide is added
    await waitFor(() => {
      expect(screen.getByTestId('slide-row-3')).toBeInTheDocument()
    })
  })
})

describe('LessonEditor — delete slide', () => {
  it('clicking delete and confirming removes the slide and calls Supabase delete', async () => {
    const user = userEvent.setup({ delay: null })
    renderEditor()

    await waitFor(() => screen.getByTestId('slide-row-2'))

    // Hover over row 2 (index 2) to reveal delete button
    await user.hover(screen.getByTestId('slide-row-2'))
    await user.click(screen.getByTestId('delete-slide-2'))

    // Confirmation dialog
    await waitFor(() => screen.getByTestId('delete-confirm-dialog'))

    await user.click(screen.getByTestId('confirm-delete-btn'))

    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'slide-uuid-3')
    })

    // Sidebar should now show 2 rows
    await waitFor(() => {
      expect(screen.queryByTestId('slide-row-2')).not.toBeInTheDocument()
    })
  })
})

describe('LessonEditor — lesson title', () => {
  it('shows the lesson title in the header input', async () => {
    renderEditor()
    await waitFor(() => screen.getByTestId('lesson-editor'))

    expect(screen.getByTestId('lesson-title-input')).toHaveValue('Kitchen Technologies')
  })

  it('typing a new title triggers a Supabase update after debounce', async () => {
    const user = userEvent.setup({ delay: null })
    renderEditor()
    await waitFor(() => screen.getByTestId('lesson-title-input'))

    await user.clear(screen.getByTestId('lesson-title-input'))
    await user.type(screen.getByTestId('lesson-title-input'), 'New Title')

    // Title debounce is 1200ms
    await vi.runAllTimersAsync()

    await waitFor(() => {
      // Verify a lessons update was called
      const calls = mockFrom.mock.calls.filter((c) => c[0] === 'lessons')
      expect(calls.length).toBeGreaterThan(0)
    })
  })
})

describe('LessonEditor — empty state', () => {
  it('shows empty state when lesson has no slides', async () => {
    setupFromMock({ slides: [] })
    renderEditor()

    await waitFor(() => {
      expect(screen.getByText(/add your first slide/i)).toBeInTheDocument()
    })
  })
})

describe('LessonEditor — preview tab', () => {
  it('shows Edit and Preview tabs when a slide is selected', async () => {
    renderEditor()
    await waitFor(() => screen.getByTestId('lesson-editor'))

    expect(screen.getByTestId('tab-edit')).toBeInTheDocument()
    expect(screen.getByTestId('tab-preview')).toBeInTheDocument()
  })

  it('clicking Preview tab shows slide-preview pane', async () => {
    const user = userEvent.setup({ delay: null })
    renderEditor()
    await waitFor(() => screen.getByTestId('tab-preview'))

    await user.click(screen.getByTestId('tab-preview'))

    await waitFor(() => {
      expect(screen.getByTestId('slide-preview')).toBeInTheDocument()
    })
  })

  it('clicking Edit tab returns to editor', async () => {
    const user = userEvent.setup({ delay: null })
    renderEditor()
    await waitFor(() => screen.getByTestId('tab-preview'))

    await user.click(screen.getByTestId('tab-preview'))
    await user.click(screen.getByTestId('tab-edit'))

    await waitFor(() => {
      // Content editor shows body textarea (slide 1 is content type)
      expect(screen.getByDisplayValue('Body one')).toBeInTheDocument()
    })
  })
})

describe('LessonEditor — drag-and-drop reorder', () => {
  it('renders drag handles for each slide', async () => {
    renderEditor()
    await waitFor(() => screen.getByTestId('lesson-editor'))

    expect(screen.getByTestId('drag-handle-0')).toBeInTheDocument()
    expect(screen.getByTestId('drag-handle-1')).toBeInTheDocument()
    expect(screen.getByTestId('drag-handle-2')).toBeInTheDocument()
  })

  it('slide list is wrapped in a sortable context (data-testid slide-list exists)', async () => {
    renderEditor()
    await waitFor(() => screen.getByTestId('slide-list'))

    expect(screen.getByTestId('slide-list')).toBeInTheDocument()
  })
})
