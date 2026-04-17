import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import type { LessonState } from '@/contexts/lessonReducer'
import { LessonShell } from './LessonShell'
import kitchenTechnologies from '@/lessons/kitchen-technologies'

// matchMedia is not available in jsdom — stub it before every test.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})

function renderShell() {
  const lesson = kitchenTechnologies
  return render(
    <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
      <LessonShell lesson={lesson} />
    </LessonProvider>
  )
}

function renderShellAt(slideIndex: number, stateOverrides: Partial<LessonState> = {}) {
  const lesson = kitchenTechnologies
  const initialState: LessonState = {
    ...makeLessonState(lesson.id, lesson.slides),
    currentSlideIndex: slideIndex,
    ...stateOverrides,
  }
  return render(
    <LessonProvider initialState={initialState}>
      <LessonShell lesson={lesson} />
    </LessonProvider>
  )
}

// ── Initial render ────────────────────────────────────────────────────────────

describe('LessonShell — initial render', () => {
  it('renders the lesson title in the header', () => {
    renderShell()
    expect(
      screen.getByText('Unit 2 Kitchen Technologies: Writing the Group Action Plan')
    ).toBeInTheDocument()
  })

  it('renders the first slide content', () => {
    renderShell()
    // Slide 1 is a content slide with title "Welcome to the Action Plan lesson"
    expect(
      screen.getByRole('heading', { name: 'Welcome to the Action Plan lesson' })
    ).toBeInTheDocument()
  })

  it('renders the slide counter "1 of 18"', () => {
    renderShell()
    expect(screen.getByText('1 of 18')).toBeInTheDocument()
  })

  it('renders the ActionPlanPanel with six "Not yet written" placeholders', () => {
    renderShell()
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    const placeholders = within(panel).getAllByText('Not yet written')
    expect(placeholders).toHaveLength(6)
  })

  it('renders the scribe chip with "No group assigned" when no studentId is provided', () => {
    renderShell()
    // No studentId → no group fetch → chip shows default
    expect(screen.getByText('No group assigned')).toBeInTheDocument()
  })

  it('renders the save status chip', () => {
    renderShell()
    expect(screen.getByTestId('save-status-chip')).toBeInTheDocument()
  })

  it('Back button is disabled on the first slide', () => {
    renderShell()
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
  })

  it('Next button is enabled on the first slide', () => {
    renderShell()
    expect(screen.getByRole('button', { name: 'Next slide' })).not.toBeDisabled()
  })
})

// ── Header layout ─────────────────────────────────────────────────────────────

describe('LessonShell — header layout', () => {
  it('lesson title and progress dots are in separate row containers', () => {
    renderShell()

    const row1 = screen.getByTestId('header-row-1')
    const row2 = screen.getByTestId('header-row-2')
    const title = screen.getByText('Unit 2 Kitchen Technologies: Writing the Group Action Plan')
    const dots = screen.getByRole('progressbar', { name: 'Lesson progress' })

    expect(row1).toContainElement(title)
    expect(row2).toContainElement(dots)
    expect(row1).not.toContainElement(dots)
    expect(row2).not.toContainElement(title)
  })

  it('save status chip is in row 1 alongside the title', () => {
    renderShell()
    const row1 = screen.getByTestId('header-row-1')
    const saveChip = screen.getByTestId('save-status-chip')
    expect(row1).toContainElement(saveChip)
  })

  it('section name is in row 2 alongside the dots', () => {
    renderShell()
    const row2 = screen.getByTestId('header-row-2')
    // Slide 1 is in the orientation section
    const sectionName = screen.getByText('Orientation')
    expect(row2).toContainElement(sectionName)
  })
})

// ── Next-button gating ────────────────────────────────────────────────────────

describe('LessonShell — Next gating', () => {
  it('Next is always enabled on a Content slide', () => {
    renderShellAt(0) // slide 1, content
    expect(screen.getByRole('button', { name: 'Next slide' })).not.toBeDisabled()
  })

  it('Next is disabled on an MCQ slide before any correct answer is stored', () => {
    renderShellAt(2) // slide 3, MCQ (orientation rule-check)
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  })

  it('Next is enabled on an MCQ slide after mcqResult is stored as correct', () => {
    const mcqSlide = kitchenTechnologies.slides[2]
    renderShellAt(2, {
      answers: {
        [mcqSlide.id]: { kind: 'text', values: { mcqResult: 'correct' } },
      },
    })
    expect(screen.getByRole('button', { name: 'Next slide' })).not.toBeDisabled()
  })

  it('Next is disabled on a framed scaffold slide before commit', () => {
    renderShellAt(4) // slide 5, aim scaffold
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  })

  it('Next is enabled on a framed scaffold slide after commit', () => {
    const scaffoldSlide = kitchenTechnologies.slides[4]
    renderShellAt(4, {
      committedSlideIds: [scaffoldSlide.id],
    })
    expect(screen.getByRole('button', { name: 'Next slide' })).not.toBeDisabled()
  })
})

// ── Navigation ────────────────────────────────────────────────────────────────

describe('LessonShell — keyboard navigation', () => {
  it('pressing Next advances to slide 2', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Next slide' }))

    expect(screen.getByText('2 of 18')).toBeInTheDocument()
  })

  it('slide 2 renders a content slide with its heading', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Next slide' }))

    // Slide 2 is a content slide titled "Four rules for your Action Plan"
    expect(
      screen.getByRole('heading', { name: 'Four rules for your Action Plan' })
    ).toBeInTheDocument()
  })

  it('Back returns from slide 2 to slide 1', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(screen.getByText('2 of 18')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(screen.getByText('1 of 18')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Welcome to the Action Plan lesson' })
    ).toBeInTheDocument()
  })

  it('Tab from the top of the page reaches the Next button', async () => {
    const user = userEvent.setup()
    renderShell()

    // Tab through focusable elements until we hit the Next button or exhaust
    // the reachable element set. The Next button must be reachable.
    let found = false
    for (let i = 0; i < 20; i++) {
      await user.tab()
      if (document.activeElement === screen.getByRole('button', { name: 'Next slide' })) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })
})
