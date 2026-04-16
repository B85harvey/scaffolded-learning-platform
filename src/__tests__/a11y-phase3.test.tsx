/**
 * Axe accessibility smoke tests — Phase 3 pages.
 *
 * Mounts each new page with representative mock data and asserts zero
 * critical/serious axe violations. colour-contrast is skipped for the same
 * reason as a11y.test.tsx: jsdom cannot compute CSS computed styles.
 *
 * Pages tested:
 *   StudentHome   — one open unit, one closed unit
 *   UnitView      — one in-progress lesson, one complete lesson
 *   SessionSummary — mock committed sections
 *   WelcomeScreen  — authenticated student
 *   AdminClassForm — teacher with existing class
 *   AdminUnitManager — teacher, two units (one draft, one open)
 *   AdminGroupForm — teacher with mock students, no groups yet
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StudentHome } from '@/pages/StudentHome'
import { UnitView } from '@/pages/UnitView'
import { SessionSummary } from '@/pages/SessionSummary'
import { WelcomeScreen } from '@/pages/WelcomeScreen'
import { AdminClassForm } from '@/pages/admin/AdminClassForm'
import { AdminUnitManager } from '@/pages/admin/AdminUnitManager'
import { AdminGroupForm } from '@/pages/admin/AdminGroupForm'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))
vi.mock('@/lib/completionCalc', () => ({
  calcUnitCompletion: vi.fn().mockResolvedValue(75),
  getLessonStatus: vi.fn().mockResolvedValue({ status: 'not_started', currentSlideIndex: 0 }),
}))

// ── Supabase mock ─────────────────────────────────────────────────────────────

const { supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, unknown[]> = {
    class_members: [{ class_id: 'class-1', student_id: 'student-1', joined_at: '2025-01-01' }],
    unit_assignments: [
      { unit_id: 'unit-2', class_id: 'class-1', status: 'open' },
      { unit_id: 'unit-3', class_id: 'class-1', status: 'closed' },
    ],
    lesson_progress: [
      { lesson_id: 'kitchen-technologies', status: 'in_progress', current_slide_index: 4 },
    ],
    lesson_submissions: [
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
    ],
    profiles: [
      { id: 'student-1', display_name: 'Alice Student', email: 'alice@test.com' },
      { id: 'student-a', display_name: 'Alice', email: 'alice@test.com' },
      { id: 'student-b', display_name: 'Bob', email: 'bob@test.com' },
    ],
    classes: [{ id: 'class-1', teacher_id: 'teacher-1', name: 'My Class' }],
    groups: [],
    group_members: [],
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

  return { supabaseMock: { tables, from: (t: string) => makeBuilder(tables[t] ?? []) } }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

// ── Auth helpers ──────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const STUDENT = {
  session: { user: { id: 'student-1' } } as never,
  profile: { role: 'student' as const, display_name: 'Alice Student' } as never,
  loading: false,
  signOut: vi.fn(),
}

const TEACHER = {
  session: { user: { id: 'teacher-1' } } as never,
  profile: { role: 'teacher' as const, display_name: 'Ms Harvey' } as never,
  loading: false,
  signOut: vi.fn(),
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue(STUDENT)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  )
  vi.stubGlobal('navigator', { ...navigator, onLine: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Axe helper ────────────────────────────────────────────────────────────────

const AXE_CONFIG: axe.RunOptions = {
  rules: {
    'color-contrast': { enabled: false },
  },
}

async function runAxe(container: Element) {
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('a11y-phase3 — StudentHome', () => {
  it('has zero critical/serious violations with one open and one closed unit', async () => {
    mockUseAuth.mockReturnValue(STUDENT)
    const { container } = render(
      <MemoryRouter>
        <StudentHome />
      </MemoryRouter>
    )
    // Wait for async data load
    await waitFor(() => {
      expect(container.querySelector('[data-testid="unit-card-unit-2"]')).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

describe('a11y-phase3 — UnitView', () => {
  it('has zero critical/serious violations with an in-progress lesson', async () => {
    mockUseAuth.mockReturnValue(STUDENT)
    const { container } = render(
      <MemoryRouter initialEntries={['/unit/unit-2']}>
        <Routes>
          <Route path="/unit/:unitId" element={<UnitView />} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="lesson-card-kitchen-technologies"]')
      ).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

describe('a11y-phase3 — SessionSummary', () => {
  it('has zero critical/serious violations with committed sections', async () => {
    // studentId in URL must match session user.id for auth guard to pass
    mockUseAuth.mockReturnValue(STUDENT)
    const { container } = render(
      <MemoryRouter initialEntries={['/session/kitchen-technologies/student-1']}>
        <Routes>
          <Route path="/session/:lessonId/:studentId" element={<SessionSummary />} />
          <Route path="/home" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => {
      // Wait for loading to finish (copy-all-btn appears when done)
      expect(container.querySelector('[data-testid="copy-all-btn"]')).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

describe('a11y-phase3 — WelcomeScreen', () => {
  it('has zero critical/serious violations', async () => {
    mockUseAuth.mockReturnValue(STUDENT)
    const { container } = render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    )
    // WelcomeScreen is synchronous after mount (className is fetched async but not needed for a11y)
    await waitFor(() => {
      expect(container.querySelector('main')).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

describe('a11y-phase3 — AdminClassForm', () => {
  it('has zero critical/serious violations', async () => {
    mockUseAuth.mockReturnValue(TEACHER)
    const { container } = render(
      <MemoryRouter>
        <AdminClassForm />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(container.querySelector('form')).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

describe('a11y-phase3 — AdminUnitManager', () => {
  it('has zero critical/serious violations with one open unit', async () => {
    mockUseAuth.mockReturnValue(TEACHER)
    const { container } = render(
      <MemoryRouter>
        <AdminUnitManager />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(container.querySelector('[data-testid="unit-row-unit-2"]')).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})

describe('a11y-phase3 — AdminGroupForm', () => {
  it('has zero critical/serious violations with mock students loaded', async () => {
    mockUseAuth.mockReturnValue(TEACHER)
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/groups/kitchen-technologies']}>
        <Routes>
          <Route path="/admin/groups/:lessonId" element={<AdminGroupForm />} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => {
      // Wait for loading to finish — add-group-btn appears after load
      expect(container.querySelector('[data-testid="add-group-btn"]')).toBeTruthy()
    })
    const violations = await runAxe(container)
    expect(violations).toHaveLength(0)
  })
})
