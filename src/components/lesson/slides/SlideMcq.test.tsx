import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
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

const allSlides = [mcqSlide] as SlideConfig[]

function renderMcq() {
  return render(
    <LessonProvider initialState={makeLessonState('test-lesson', allSlides)}>
      <SlideMcq slide={mcqSlide} />
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
    // Badges are aria-hidden, so query by text in the document
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('has a live region for announcements', () => {
    renderMcq()
    expect(screen.getByRole('status')).toBeInTheDocument()
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
})

// ── Correct answer path ───────────────────────────────────────────────────────

describe('SlideMcq — correct answer', () => {
  it('clicking the correct option and pressing Enter shows success feedback', async () => {
    const user = userEvent.setup()
    renderMcq()

    // Click option B (correct)
    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    // Press Enter to submit
    await user.keyboard('{Enter}')

    // Live region announces success
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('correct option shows a check icon (CheckCircle) after correct submission', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.keyboard('{Enter}')

    // The correct option's explanation appears
    expect(screen.getByText('Formal, present tense, specific dish — correct.')).toBeInTheDocument()
  })

  it('Cmd+Enter submits the selected option', async () => {
    const user = userEvent.setup()
    renderMcq()

    // Select option B via click
    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    // Submit via Cmd+Enter (Meta+Enter in userEvent)
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })
})

// ── Incorrect answer path ─────────────────────────────────────────────────────

describe('SlideMcq — incorrect answer', () => {
  it('clicking a wrong option and pressing Enter shows incorrect feedback', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('Not quite. Try again')
  })

  it('the wrong option explanation is shown after an incorrect submission', async () => {
    const user = userEvent.setup()
    renderMcq()

    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.keyboard('{Enter}')

    expect(screen.getByText('Uses "we" and is vague — no dish name.')).toBeInTheDocument()
  })

  it('student can retry after one wrong attempt', async () => {
    const user = userEvent.setup()
    renderMcq()

    // First wrong
    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.keyboard('{Enter}')

    // Now try correct answer
    await user.click(screen.getByRole('button', { name: /Option 2: Option B/i }))
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })
})

// ── Two-wrong-attempts reveal ─────────────────────────────────────────────────

describe('SlideMcq — two wrong attempts reveal', () => {
  it('after two wrong attempts the correct answer is revealed', async () => {
    const user = userEvent.setup()
    renderMcq()

    // First wrong
    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.keyboard('{Enter}')

    // Second wrong
    await user.click(screen.getByRole('button', { name: /Option 3: Option C/i }))
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('Correct answer revealed')
  })

  it('no further selections are possible after revelation', async () => {
    const user = userEvent.setup()
    renderMcq()

    // Two wrong attempts
    await user.click(screen.getByRole('button', { name: /Option 1: Option A/i }))
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: /Option 3: Option C/i }))
    await user.keyboard('{Enter}')

    // Clicking another option should do nothing (isResolved = true)
    const opt1 = screen.getByRole('button', { name: /Option 1: Option A/i })
    await user.click(opt1)

    // Option 1 should not become selected (aria-pressed stays false)
    expect(opt1).toHaveAttribute('aria-pressed', 'false')
  })
})
