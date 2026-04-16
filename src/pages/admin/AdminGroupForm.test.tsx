/**
 * AdminGroupForm tests.
 *
 * Mocks useAuth (teacher), supabase, AppNav, SkipToContent.
 * Verifies:
 *   - Groups can be created, students assigned, scribes set, and saved.
 *   - Saving without a scribe shows a validation error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminGroupForm } from './AdminGroupForm'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/components/AppNav', () => ({ AppNav: () => <nav aria-label="Main navigation" /> }))
vi.mock('@/components/SkipToContent', () => ({ SkipToContent: () => null }))

const { supabaseMock } = vi.hoisted(() => {
  const upsertCalls: Array<{ table: string; rows: unknown[]; opts: unknown }> = []

  const tables: Record<string, unknown[]> = {
    classes: [{ id: 'class-1', teacher_id: 'teacher-1' }],
    class_members: [
      { student_id: 'student-a' },
      { student_id: 'student-b' },
      { student_id: 'student-c' },
      { student_id: 'student-d' },
    ],
    profiles: [
      { id: 'student-a', display_name: 'Alice', email: 'alice@test.com' },
      { id: 'student-b', display_name: 'Bob', email: 'bob@test.com' },
      { id: 'student-c', display_name: 'Carol', email: 'carol@test.com' },
      { id: 'student-d', display_name: 'Dan', email: 'dan@test.com' },
    ],
    groups: [],
    group_members: [],
  }

  function makeUpsertBuilder(table: string) {
    return {
      then: (resolve: (v: unknown) => void) => {
        return Promise.resolve({ error: null }).then(resolve)
      },
    }
    void table
  }

  function makeBuilder(rows: unknown[], table: string) {
    return {
      select: () => makeBuilder(rows, table),
      eq: (_c: string, _v: unknown) => {
        void _c
        void _v
        return makeBuilder(rows, table)
      },
      in: (_c: string, _v: unknown[]) => {
        void _c
        void _v
        return makeBuilder(rows, table)
      },
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
      upsert: (data: unknown[], opts?: unknown) => {
        upsertCalls.push({ table, rows: data, opts })
        return makeUpsertBuilder(table)
      },
    }
  }

  return {
    supabaseMock: {
      tables,
      upsertCalls,
      from: (t: string) => makeBuilder(tables[t] ?? [], t),
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => supabaseMock.from(t) },
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

const { useAuth } = await import('@/contexts/AuthContext')
const mockUseAuth = vi.mocked(useAuth)

const TEACHER = {
  session: { user: { id: 'teacher-1' } } as never,
  profile: { role: 'teacher' as const, display_name: 'Ms Harvey' } as never,
  loading: false,
  signOut: vi.fn(),
}

beforeEach(() => {
  vi.resetAllMocks()
  supabaseMock.tables['classes'] = [{ id: 'class-1', teacher_id: 'teacher-1' }]
  supabaseMock.tables['class_members'] = [
    { student_id: 'student-a' },
    { student_id: 'student-b' },
    { student_id: 'student-c' },
    { student_id: 'student-d' },
  ]
  supabaseMock.tables['profiles'] = [
    { id: 'student-a', display_name: 'Alice', email: 'alice@test.com' },
    { id: 'student-b', display_name: 'Bob', email: 'bob@test.com' },
    { id: 'student-c', display_name: 'Carol', email: 'carol@test.com' },
    { id: 'student-d', display_name: 'Dan', email: 'dan@test.com' },
  ]
  supabaseMock.tables['groups'] = []
  supabaseMock.tables['group_members'] = []
  supabaseMock.upsertCalls.length = 0
  mockUseAuth.mockReturnValue(TEACHER)
})

function renderGroupForm(lessonId = 'kitchen-technologies') {
  return render(
    <MemoryRouter initialEntries={[`/admin/groups/${lessonId}`]}>
      <Routes>
        <Route path="/admin/groups/:lessonId" element={<AdminGroupForm />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminGroupForm — create groups and save', () => {
  it('upserts groups and group_members when form is complete', async () => {
    const user = userEvent.setup()
    renderGroupForm()

    // Wait for students to load
    await waitFor(() => expect(screen.getByTestId('add-group-btn')).toBeInTheDocument())

    // Add Group 1
    await user.click(screen.getByTestId('add-group-btn'))
    // Add Group 2
    await user.click(screen.getByTestId('add-group-btn'))

    // Get group IDs from newly rendered cards
    await waitFor(() => {
      const cards = document.querySelectorAll('[data-testid^="group-card-"]')
      expect(cards).toHaveLength(2)
    })

    const cards = document.querySelectorAll('[data-testid^="group-card-"]')
    const g1Id = cards[0].getAttribute('data-testid')!.replace('group-card-', '')
    const g2Id = cards[1].getAttribute('data-testid')!.replace('group-card-', '')

    // Assign Alice and Bob to group 1
    const select1 = screen.getByTestId(`add-student-select-${g1Id}`)
    await user.selectOptions(select1, 'student-a')
    await user.click(screen.getByTestId(`add-student-btn-${g1Id}`))

    await user.selectOptions(screen.getByTestId(`add-student-select-${g1Id}`), 'student-b')
    await user.click(screen.getByTestId(`add-student-btn-${g1Id}`))

    // Set Alice as scribe for group 1
    await user.click(screen.getByTestId(`scribe-radio-${g1Id}-student-a`))

    // Assign Carol and Dan to group 2
    const select2 = screen.getByTestId(`add-student-select-${g2Id}`)
    await user.selectOptions(select2, 'student-c')
    await user.click(screen.getByTestId(`add-student-btn-${g2Id}`))

    await user.selectOptions(screen.getByTestId(`add-student-select-${g2Id}`), 'student-d')
    await user.click(screen.getByTestId(`add-student-btn-${g2Id}`))

    // Set Carol as scribe for group 2
    await user.click(screen.getByTestId(`scribe-radio-${g2Id}-student-c`))

    // Save
    await user.click(screen.getByTestId('save-groups-btn'))

    await waitFor(() => {
      expect(supabaseMock.upsertCalls.length).toBeGreaterThanOrEqual(2)
    })

    // Verify groups upsert
    const groupsUpsert = supabaseMock.upsertCalls.find((c) => c.table === 'groups')
    expect(groupsUpsert).toBeDefined()
    expect(Array.isArray(groupsUpsert!.rows)).toBe(true)
    expect((groupsUpsert!.rows as unknown[]).length).toBe(2)

    // Verify group_members upsert
    const membersUpsert = supabaseMock.upsertCalls.find((c) => c.table === 'group_members')
    expect(membersUpsert).toBeDefined()
    const members = membersUpsert!.rows as Array<{
      group_id: string
      student_id: string
      is_scribe: boolean
    }>
    expect(members.length).toBe(4)

    // Alice is scribe for group 1
    const alice = members.find((m) => m.student_id === 'student-a')
    expect(alice?.is_scribe).toBe(true)

    // Carol is scribe for group 2
    const carol = members.find((m) => m.student_id === 'student-c')
    expect(carol?.is_scribe).toBe(true)
  })
})

describe('AdminGroupForm — validation', () => {
  it('shows validation error when a group has no scribe', async () => {
    const user = userEvent.setup()
    renderGroupForm()

    await waitFor(() => expect(screen.getByTestId('add-group-btn')).toBeInTheDocument())

    // Add one group, assign all 4 students, set NO scribe
    await user.click(screen.getByTestId('add-group-btn'))

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-testid^="group-card-"]')
      expect(cards).toHaveLength(1)
    })

    const cards = document.querySelectorAll('[data-testid^="group-card-"]')
    const gId = cards[0].getAttribute('data-testid')!.replace('group-card-', '')

    for (const sid of ['student-a', 'student-b', 'student-c', 'student-d']) {
      await user.selectOptions(screen.getByTestId(`add-student-select-${gId}`), sid)
      await user.click(screen.getByTestId(`add-student-btn-${gId}`))
    }

    // Attempt to save without setting a scribe
    await user.click(screen.getByTestId('save-groups-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('validation-errors')).toBeInTheDocument()
    })

    expect(screen.getByTestId('validation-errors').textContent).toMatch(/no scribe/i)
    expect(supabaseMock.upsertCalls.length).toBe(0)
  })

  it('shows validation error when a student is not assigned to any group', async () => {
    const user = userEvent.setup()
    renderGroupForm()

    await waitFor(() => expect(screen.getByTestId('add-group-btn')).toBeInTheDocument())

    // Add one group with only 2 students (Alice with scribe)
    await user.click(screen.getByTestId('add-group-btn'))

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-testid^="group-card-"]')
      expect(cards).toHaveLength(1)
    })

    const cards = document.querySelectorAll('[data-testid^="group-card-"]')
    const gId = cards[0].getAttribute('data-testid')!.replace('group-card-', '')

    await user.selectOptions(screen.getByTestId(`add-student-select-${gId}`), 'student-a')
    await user.click(screen.getByTestId(`add-student-btn-${gId}`))

    await user.click(screen.getByTestId(`scribe-radio-${gId}-student-a`))

    // Save — Bob, Carol, Dan are unassigned
    await user.click(screen.getByTestId('save-groups-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('validation-errors')).toBeInTheDocument()
    })

    expect(screen.getByTestId('validation-errors').textContent).toMatch(/not assigned/i)
  })
})
