/**
 * Phase 3 end-to-end smoke test.
 *
 * Shallow integration test confirming that the routing and data flow for the
 * student path hang together. Uses MemoryRouter to simulate navigation between
 * StudentHome → UnitView → LessonShell without a browser.
 *
 * Not a full 17-slide walkthrough — that is covered by walkthrough.test.tsx.
 * This test verifies that:
 *   1. StudentHome renders a unit card for an open unit.
 *   2. Clicking the unit card navigates to UnitView where the lesson card
 *      appears with "Not started" status.
 *   3. Clicking the lesson card navigates to LessonPage which renders the
 *      LessonShell with the first content slide visible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StudentHome } from '@/pages/StudentHome'
import { UnitView } from '@/pages/UnitView'
import { LessonPage } from '@/pages/lesson/LessonPage'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))
vi.mock('@/lib/completionCalc', () => ({
  calcUnitCompletion: vi.fn().mockResolvedValue(0),
  getLessonStatus: vi.fn().mockResolvedValue({ status: 'not_started', currentSlideIndex: 0 }),
}))
// Stub real-time and scribe hooks so LessonShell doesn't open Supabase channels
vi.mock('@/hooks/useLockSubscription', () => ({ useLockSubscription: vi.fn() }))
vi.mock('@/hooks/useScribeLabel', () => ({
  useScribeLabel: vi.fn().mockReturnValue('No group assigned'),
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    class_members: [{ class_id: 'class-1' }],
    unit_assignments: [{ unit_id: 'unit-2', status: 'open' }],
    lesson_progress: [], // not started
    slide_locks: [],
    lesson_submissions: [],
    profiles: [],
    groups: [],
  }

  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }

  function makeBuilder(rows: unknown[]) {
    return {
      select: () => makeBuilder(rows),
      eq: (_c: string, _v: unknown) => {
        void _c
        void _v
        return makeBuilder(rows)
      },
      in: (_c: string, _v: unknown[]) => {
        void _c
        void _v
        return makeBuilder(rows)
      },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }

  return {
    supabaseMock: {
      tables,
      channelMock,
      from: (t: string) => makeBuilder(tables[t] ?? []),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => supabaseMock.from(t),
    channel: vi.fn().mockReturnValue(supabaseMock.channelMock),
    removeChannel: vi.fn().mockResolvedValue('ok'),
  },
}))

// Stub Dexie / IndexedDB (not available in jsdom).
// Return a minimal hydrated state so LessonShell exits the skeleton.
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

// ── Auth setup ────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)
const { hydrateLesson, hydrateLessonFromDexie } = await import('@/lib/hydrateLesson')
const { syncDirtyDrafts, updateProgress } = await import('@/lib/syncService')
const { useLockSubscription } = await import('@/hooks/useLockSubscription')
const { useScribeLabel } = await import('@/hooks/useScribeLabel')

const STUDENT = {
  session: { user: { id: 'student-1' } } as never,
  profile: { role: 'student' as const, display_name: 'Alice Student' } as never,
  loading: false,
  signOut: vi.fn(),
}

const EMPTY_HYDRATED = { answers: {}, committed: {}, currentSlideIndex: 0 }

beforeEach(() => {
  vi.resetAllMocks()

  // Re-establish implementations cleared by resetAllMocks
  mockUseAuth.mockReturnValue(STUDENT)
  vi.mocked(hydrateLesson).mockResolvedValue(EMPTY_HYDRATED as never)
  vi.mocked(hydrateLessonFromDexie).mockResolvedValue(EMPTY_HYDRATED as never)
  vi.mocked(syncDirtyDrafts).mockResolvedValue(undefined)
  vi.mocked(updateProgress).mockResolvedValue(undefined)
  vi.mocked(useLockSubscription).mockReturnValue(undefined)
  vi.mocked(useScribeLabel).mockReturnValue('No group assigned')

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  vi.stubGlobal('navigator', { ...navigator, onLine: true })
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '' },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── All three routes rendered together ───────────────────────────────────────

function renderSmoke() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<StudentHome />} />
        <Route path="/unit/:unitId" element={<UnitView />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase 3 smoke — student navigation flow', () => {
  it('StudentHome: renders the open unit card', async () => {
    renderSmoke()

    await waitFor(() => {
      expect(screen.getByTestId('unit-card-unit-2')).toBeInTheDocument()
    })

    // The unit card is a link to UnitView
    const link = screen.getByTestId('unit-card-unit-2').closest('a')
    expect(link).toHaveAttribute('href', '/unit/unit-2')
  })

  it('UnitView: clicking the unit card shows the lesson card with "Not started"', async () => {
    const user = userEvent.setup()
    renderSmoke()

    // Wait for StudentHome to load
    await waitFor(() => {
      expect(screen.getByTestId('unit-card-unit-2')).toBeInTheDocument()
    })

    // Navigate into UnitView
    await user.click(screen.getByTestId('unit-card-unit-2').closest('a')!)

    await waitFor(() => {
      expect(screen.getByTestId('lesson-card-kitchen-technologies')).toBeInTheDocument()
    })

    expect(screen.getByText('Not started')).toBeInTheDocument()
  })

  it('LessonPage: clicking the lesson card loads LessonShell with first slide', async () => {
    const user = userEvent.setup()
    renderSmoke()

    // Navigate to UnitView
    await waitFor(() => screen.getByTestId('unit-card-unit-2'))
    await user.click(screen.getByTestId('unit-card-unit-2').closest('a')!)

    // Wait for lesson card
    await waitFor(() => screen.getByTestId('lesson-card-kitchen-technologies'))

    // Navigate into lesson
    const lessonLink = screen.getByTestId('lesson-card-kitchen-technologies').closest('a')!
    await user.click(lessonLink)

    // LessonShell exits the skeleton and renders the first slide
    await waitFor(
      () => {
        // lesson-skeleton disappears when hydration completes
        expect(screen.queryByTestId('lesson-skeleton')).not.toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Navigation buttons are present once the slide is loaded
    expect(screen.getByLabelText(/next slide/i)).toBeInTheDocument()
  })
})
