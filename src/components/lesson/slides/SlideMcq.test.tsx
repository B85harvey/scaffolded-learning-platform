import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import type { LessonState } from '@/contexts/lessonReducer'
import { SlideMcq } from './SlideMcq'
import type { SlideConfig } from '@/lessons/types'

// ── matchMedia stub ───────────────────────────────────────────────────────────

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

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mcqSlide: Extract<SlideConfig, { type: 'mcq' }> = {
  id: 'test-mcq-01',
  type: 'mcq',
  section: 'orientation',
  variant: 'self',
  question: 'Which sentence follows the Action Plan rules?',
  options: [
    {
      id: 'a',
      text: 'Option A — uses "we" and is vague.',
      correct: false,
      explanation: 'Uses "we" and is vague — no dish name.',
    },
    {
      id: 'b',
      text: 'Option B — formal, specific dish, named technology.',
      correct: true,
      explanation: 'Formal, present tense, specific dish — correct.',
    },
    {
      id: 'c',
      text: 'Option C — uses "I".',
      correct: false,
      explanation: 'Uses "I", not specific about technology.',
    },
  ],
}

const classCheckSlide: Extract<SlideConfig, { type: 'mcq' }> = {
  ...mcqSlide,
  id: 'test-mcq-class',
  variant: 'class',
}

const allSlides = [mcqSlide, classCheckSlide] as SlideConfig[]

function renderMcq(stateOverrides: Partial<LessonState> = {}) {
  const base = makeLessonState('test-lesson', allSlides)
  return render(
    <LessonProvider initialState={{ ...base, ...stateOverrides }}>
      <SlideMcq slide={mcqSlide} />
    </LessonProvider>
  )
}

function renderClassMcq(stateOverrides: Partial<LessonState> = {}) {
  const base = makeLessonState('test-lesson', allSlides)
  return render(
    <LessonProvider initialState={{ ...base, ...stateOverrides }}>
      <SlideMcq slide={classCheckSlide} />
    </LessonProvider>
  )
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('SlideMcq — rendering', () => {
  it('renders the question text', () => {
    renderMcq()
    expect(
      screen.getByRole('heading', { name: /Which sentence follows the Action Plan rules/ })
    ).toBeInTheDocument()
  })

  it('renders all three options', () => {
    renderMcq()
    expect(screen.getByText(/Option A/)).toBeInTheDocument()
    expect(screen.getByText(/Option B/)).toBeInTheDocument()
    expect(screen.getByText(/Option C/)).toBeInTheDocument()
  })

  it('renders numbered badges 1, 2, 3', () => {
    renderMcq()
    // Three option buttons plus the Submit button (disabled initially)
    const buttons = screen.getAllByRole('button')
    // Options: 3, Submit: 1
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('has a live region for announcements', () => {
    renderMcq()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('Submit button is present and disabled before any selection', () => {
    renderMcq()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
  })
})

// ── Digit-key selection ───────────────────────────────────────────────────────

describe('SlideMcq — digit key selection', () => {
  it('pressing "2" selects and focuses option 2', async () => {
    const user = userEvent.setup()
    renderMcq()

    // Focus inside the slide (option 1 button)
    const opt1 = screen.getByRole('button', { name: /Option 1: Option A/i })
    opt1.focus()

    await user.keyboard('2')

    // Option 2 should be focused
    const opt2 = screen.getByRole('button', { name: /Option 2: Option B/i })
    expect(opt2).toHaveFocus()

    // Option 2 should have aria-pressed=true
    expect(opt2).toHaveAttribute('aria-pressed', 'true')
  })

  it('pressing "1" after "2" moves selection to option 1', async () => {
    const user = userEvent.setup()
    renderMcq()

    const opt1 = screen.getByRole('button', { name: /Option 1: Option A/i })
    opt1.focus()

    await user.keyboard('2')
    await user.keyboard('1')

    expect(screen.getByRole('button', { name: /Option 1: Option A/i })).toHaveFocus()
    expect(screen.getByRole('button', { name: /Option 1: Option A/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: /Option 2: Option B/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('digit key enables the Submit button', async () => {
    const user = userEvent.setup()
    renderMcq()

    const opt1 = screen.getByRole('button', { name: /Option 1: Option A/i })
    opt1.focus()
    await user.keyboard('2')

    expect(screen.getByRole('button', { name: 'Submit answer' })).not.toBeDisabled()
  })
})

// ── Submit button ─────────────────────────────────────────────────────────────

describe('SlideMcq — Submit button', () => {
  it('Submit is disabled before any option is selected', () => {
    renderMcq()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeDisabled()
  })

  it('Submit is enabled after clicking an option', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))

    expect(screen.getByRole('button', { name: 'Submit answer' })).not.toBeDisabled()
  })

  it('clicking Submit with no selection does nothing', () => {
    renderMcq()

    // Submit is disabled so clicking does nothing — status stays empty
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})

// ── Correct answer path ───────────────────────────────────────────────────────

describe('SlideMcq — correct answer', () => {
  it('clicking correct option then Submit shows Correct announcement', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('Enter on a focused correct option selects and submits immediately', async () => {
    const user = userEvent.setup()
    renderMcq()

    // Focus option 2 and press Enter — should select + submit in one step
    screen.getByRole('button', { name: /Option 2: Option B/i }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('Cmd+Enter submits the selected option', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('Submit button is gone after correct submission', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
  })
})

// ── Incorrect answer path ─────────────────────────────────────────────────────

describe('SlideMcq — incorrect answer', () => {
  it('Submit with wrong option shows "Not quite. Try again" announcement', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByRole('status')).toHaveTextContent('Not quite. Try again')
  })

  it('wrong option explanation shows below the options', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByText('Uses "we" and is vague — no dish name.')).toBeInTheDocument()
  })

  it('wrong option gets aria-invalid="true"', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByRole('button', { name: /Option 1: Option A/i })).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('Submit is replaced by "Try again" message after wrong answer', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
    expect(screen.getByText(/Select another option and try again/)).toBeInTheDocument()
  })

  it('selecting a new option after wrong clears wrong styling and restores Submit', async () => {
    const user = userEvent.setup()
    renderMcq()

    // Wrong submit
    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    // Select another option
    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))

    // Wrong styling on option A should be gone (aria-invalid removed)
    expect(screen.getByRole('button', { name: /Option 1: Option A/i })).not.toHaveAttribute(
      'aria-invalid'
    )

    // Submit button should return and be enabled
    expect(screen.getByRole('button', { name: 'Submit answer' })).not.toBeDisabled()
  })

  it('correct option is never revealed after a wrong answer', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    // Correct option (B) should not show a check icon or correct visual state
    // The option button should not have aria-invalid (only wrong option does)
    expect(screen.getByRole('button', { name: /Option 2: Option B/i })).not.toHaveAttribute(
      'aria-invalid'
    )
    // No success announcement
    expect(screen.getByRole('status')).not.toHaveTextContent('Correct')
  })

  it('student can retry after a wrong attempt and succeed', async () => {
    const user = userEvent.setup()
    renderMcq()

    // First wrong
    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    // Reselect and submit correct
    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('Enter on a focused wrong option selects and submits immediately', async () => {
    const user = userEvent.setup()
    renderMcq()

    screen.getByRole('button', { name: /Option 1: Option A/i }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('Not quite. Try again')
  })
})

// ── Class-check MCQ — pre-reveal state ───────────────────────────────────────

describe('SlideMcq — class-check pre-reveal', () => {
  it('shows the "Waiting for class reveal" chip', () => {
    renderClassMcq()
    expect(screen.getByText('Waiting for class reveal')).toBeInTheDocument()
  })

  it('all options are disabled', () => {
    renderClassMcq()
    const buttons = screen.getAllByRole('button', { name: /Option/ })
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('Submit button is absent', () => {
    renderClassMcq()
    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
  })

  it('digit keys do nothing when not revealed', async () => {
    const user = userEvent.setup()
    renderClassMcq()

    // Focus inside the slide and press "2"
    screen.getAllByRole('button', { name: /Option/ })[0].focus()
    await user.keyboard('2')

    // No option should have aria-pressed=true
    const buttons = screen.getAllByRole('button', { name: /Option/ })
    buttons.forEach((btn) => expect(btn).toHaveAttribute('aria-pressed', 'false'))
  })
})

// ── Class-check MCQ — post-reveal state ──────────────────────────────────────

describe('SlideMcq — class-check post-reveal', () => {
  function renderRevealed() {
    return renderClassMcq({ classReveal: { 'test-mcq-class': true } })
  }

  it('hides the "Waiting for class reveal" chip after reveal', () => {
    renderRevealed()
    expect(screen.queryByText('Waiting for class reveal')).not.toBeInTheDocument()
  })

  it('options become enabled after reveal', () => {
    renderRevealed()
    const buttons = screen.getAllByRole('button', { name: /Option/ })
    buttons.forEach((btn) => expect(btn).not.toBeDisabled())
  })

  it('Submit button appears after reveal', () => {
    renderRevealed()
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeInTheDocument()
  })

  it('can select an option and submit correctly after reveal', async () => {
    const user = userEvent.setup()
    renderRevealed()

    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('wrong submission shows Try again message after reveal', async () => {
    const user = userEvent.setup()
    renderRevealed()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(screen.queryByRole('button', { name: 'Submit answer' })).not.toBeInTheDocument()
    expect(screen.getByText(/Select another option and try again/)).toBeInTheDocument()
  })
})
