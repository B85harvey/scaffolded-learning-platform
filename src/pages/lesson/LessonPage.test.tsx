/**
 * LessonPage integration tests.
 *
 * Mocks lessonLoader to simulate loading a lesson from Supabase.
 * Verifies that LessonPage:
 *  - shows a skeleton while loading
 *  - renders LessonShell with slide 1 when lessonLoader resolves
 *  - shows "Lesson not found" when lessonLoader rejects
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LessonPage } from './LessonPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/lessonLoader')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// LessonShell internals that require IndexedDB or network
vi.mock('@/lib/hydrateLesson', () => ({
  hydrateLesson: vi.fn().mockResolvedValue({ answers: {}, committed: {}, currentSlideIndex: 0 }),
  hydrateLessonFromDexie: vi
    .fn()
    .mockResolvedValue({ answers: {}, committed: {}, currentSlideIndex: 0 }),
}))
vi.mock('@/lib/syncService', () => ({
  syncDirtyDrafts: vi.fn().mockResolvedValue(undefined),
  updateProgress: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/hooks/useLockSubscription', () => ({
  useLockSubscription: vi.fn().mockReturnValue({}),
}))
vi.mock('@/hooks/useScribeLabel', () => ({
  useScribeLabel: vi.fn().mockReturnValue(''),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

// Stub matchMedia (not available in jsdom)
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  vi.resetAllMocks()
  // Re-establish hydration mocks after resetAllMocks clears them
  mockHydrateLesson.mockResolvedValue(EMPTY_HYDRATED as never)
  mockHydrateLessonFromDexie.mockResolvedValue(EMPTY_HYDRATED as never)
})

const { loadLesson } = await import('@/lib/lessonLoader')
const mockLoadLesson = vi.mocked(loadLesson)

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const { hydrateLesson, hydrateLessonFromDexie } = await import('@/lib/hydrateLesson')
const mockHydrateLesson = vi.mocked(hydrateLesson)
const mockHydrateLessonFromDexie = vi.mocked(hydrateLessonFromDexie)

const EMPTY_HYDRATED = { answers: {}, committed: {}, currentSlideIndex: 0 }

// Minimal lesson returned by lessonLoader
const MOCK_LESSON = {
  id: 'kitchen-technologies',
  title: 'Unit 2 Kitchen Technologies: Writing the Group Action Plan',
  scribe: '',
  slides: [
    {
      id: 'slide-01-orientation',
      type: 'content' as const,
      section: 'orientation' as const,
      title: 'Welcome to the Action Plan lesson',
      body: 'This lesson walks your group through writing the Action Plan.',
    },
  ],
}

function renderPage(lessonId = 'kitchen-technologies') {
  mockUseAuth.mockReturnValue({
    session: { user: { id: 'student-1' } } as never,
    profile: null,
    loading: false,
    signOut: vi.fn(),
  })

  return render(
    <MemoryRouter initialEntries={[`/lesson/${lessonId}`]}>
      <Routes>
        <Route path="/lesson/:id" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonPage — loading state', () => {
  it('shows skeleton while lesson is loading', () => {
    // Never resolve so we stay in loading state
    mockLoadLesson.mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByTestId('lesson-page-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-page-skeleton')).toHaveAttribute('aria-busy', 'true')
  })
})

describe('LessonPage — lesson loaded from DB', () => {
  it('renders LessonShell with the lesson title after loading', async () => {
    mockLoadLesson.mockResolvedValue(MOCK_LESSON)
    renderPage()

    // Wait for both LessonPage skeleton and LessonShell hydration skeleton to clear.
    // findByText retries until the element appears or the timeout is reached.
    const title = await screen.findByText(
      'Unit 2 Kitchen Technologies: Writing the Group Action Plan'
    )
    expect(title).toBeInTheDocument()
  })

  it('renders slide 1 content after loading', async () => {
    mockLoadLesson.mockResolvedValue(MOCK_LESSON)
    renderPage()

    const heading = await screen.findByRole('heading', {
      name: 'Welcome to the Action Plan lesson',
    })
    expect(heading).toBeInTheDocument()
  })

  it('calls loadLesson with the lesson id from the URL', async () => {
    mockLoadLesson.mockResolvedValue(MOCK_LESSON)
    renderPage('kitchen-technologies')

    await waitFor(() => {
      expect(mockLoadLesson).toHaveBeenCalledWith('kitchen-technologies')
    })
  })
})

describe('LessonPage — lesson not found', () => {
  it('shows "Lesson not found" when lessonLoader rejects', async () => {
    mockLoadLesson.mockRejectedValue(new Error('not found'))
    renderPage('nonexistent')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Lesson not found' })).toBeInTheDocument()
    })
  })

  it('includes the lesson id in the not-found message', async () => {
    mockLoadLesson.mockRejectedValue(new Error('not found'))
    renderPage('bad-lesson-id')

    await waitFor(() => {
      expect(screen.getByText('bad-lesson-id')).toBeInTheDocument()
    })
  })
})
