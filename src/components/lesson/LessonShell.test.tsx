import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
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

  it('renders the slide counter "1 of 17"', () => {
    renderShell()
    expect(screen.getByText('1 of 17')).toBeInTheDocument()
  })

  it('renders the ActionPlanPanel with six "Not yet written" placeholders', () => {
    renderShell()
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    const placeholders = within(panel).getAllByText('Not yet written')
    expect(placeholders).toHaveLength(6)
  })

  it('renders the scribe chip', () => {
    renderShell()
    expect(screen.getByText(/Scribe:/)).toBeInTheDocument()
  })

  it('renders the save status chip', () => {
    renderShell()
    expect(screen.getByText('Saved locally')).toBeInTheDocument()
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

// ── Navigation ────────────────────────────────────────────────────────────────

describe('LessonShell — keyboard navigation', () => {
  it('pressing Next advances to slide 2', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Next slide' }))

    expect(screen.getByText('2 of 17')).toBeInTheDocument()
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
    expect(screen.getByText('2 of 17')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(screen.getByText('1 of 17')).toBeInTheDocument()
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
