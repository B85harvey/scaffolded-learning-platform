/**
 * McqSlideEditor tests.
 *
 * Verifies option add/remove/correct-select, variant toggle, and
 * config propagation via onConfigChange.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { McqSlideEditor } from './McqSlideEditor'
import type { McqConfig } from './McqSlideEditor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(optionCount = 3): McqConfig {
  return {
    id: 'slide-mcq',
    type: 'mcq',
    section: 'orientation',
    question: 'Which statement is correct?',
    variant: 'self',
    options: Array.from({ length: optionCount }, (_, i) => ({
      id: String.fromCharCode(97 + i), // 'a', 'b', 'c', ...
      text: `Option ${i + 1}`,
      correct: i === 0,
    })),
  }
}

function setup(config: McqConfig = makeConfig(), onConfigChange = vi.fn()) {
  render(<McqSlideEditor config={config} onConfigChange={onConfigChange} />)
  return { onConfigChange }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('McqSlideEditor — rendering', () => {
  it('renders question textarea', () => {
    setup()
    expect(screen.getByRole('textbox', { name: /question/i })).toBeInTheDocument()
  })

  it('renders 3 option rows', () => {
    setup(makeConfig(3))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders variant radio buttons', () => {
    setup()
    expect(screen.getByRole('radio', { name: /self-check/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /class-check/i })).toBeInTheDocument()
  })
})

describe('McqSlideEditor — options', () => {
  it('adds an option — config gains a 4th row', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup(makeConfig(3))

    await user.click(screen.getByTestId('add-option-btn'))

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.options).toHaveLength(4)
  })

  it('deletes an option — config loses a row', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup(makeConfig(3))

    // Delete the third option
    await user.click(screen.getByRole('button', { name: /delete option 3/i }))

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.options).toHaveLength(2)
  })

  it('disables delete button when only 2 options remain', () => {
    setup(makeConfig(2))
    const deleteButtons = screen.getAllByRole('button', { name: /delete option/i })
    deleteButtons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it('disables add button at 6 options', () => {
    setup(makeConfig(6))
    expect(screen.getByTestId('add-option-btn')).toBeDisabled()
  })

  it('selecting a correct-answer radio updates config', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup(makeConfig(3))

    // Select option 2 as correct
    const radios = screen.getAllByRole('radio', { name: /mark option/i })
    await user.click(radios[1])

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.options[1].correct).toBe(true)
    expect(lastCall.options[0].correct).toBe(false)
    expect(lastCall.options[2].correct).toBe(false)
  })

  it('editing option text calls onConfigChange', () => {
    const { onConfigChange } = setup(makeConfig(3))

    const inputs = screen.getAllByRole('textbox', { name: /option \d text/i })
    fireEvent.change(inputs[0], { target: { value: 'New text' } })

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.options[0].text).toContain('New text')
  })
})

describe('McqSlideEditor — variant toggle', () => {
  it('toggling to class-check updates config', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup()

    await user.click(screen.getByRole('radio', { name: /class-check/i }))

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.variant).toBe('class')
  })

  it('toggling to self-check updates config', async () => {
    const user = userEvent.setup()
    const classConfig = { ...makeConfig(3), variant: 'class' as const }
    const { onConfigChange } = setup(classConfig)

    await user.click(screen.getByRole('radio', { name: /self-check/i }))

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.variant).toBe('self')
  })
})

describe('McqSlideEditor — question', () => {
  it('editing question textarea calls onConfigChange', () => {
    const { onConfigChange } = setup({ ...makeConfig(3), question: '' })

    fireEvent.change(screen.getByRole('textbox', { name: /question/i }), {
      target: { value: 'New question?' },
    })

    const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0] as McqConfig
    expect(lastCall.question).toContain('New question?')
  })
})
