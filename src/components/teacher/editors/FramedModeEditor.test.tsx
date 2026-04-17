/**
 * FramedModeEditor tests.
 *
 * Verifies prompt row management (add/delete) and frame token interactions.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FramedModeEditor } from './FramedModeEditor'
import type { FramedConfig } from './FramedModeEditor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(promptCount = 2): FramedConfig {
  return {
    prompts: Array.from({ length: promptCount }, (_, i) => ({
      id: `p${i + 1}`,
      text: `Answer ${i + 1}`,
      frame: 'The answer is {answer}.',
      hint: `Hint ${i + 1}`,
    })),
  }
}

function setup(config: FramedConfig = makeConfig(), onChange = vi.fn()) {
  render(<FramedModeEditor config={config} onChange={onChange} />)
  return { onChange }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FramedModeEditor — rendering', () => {
  it('renders one row per prompt', () => {
    setup(makeConfig(2))
    expect(screen.getByTestId('prompt-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-row-1')).toBeInTheDocument()
  })

  it('renders frame preview with answer chip', () => {
    setup(makeConfig(1))
    expect(screen.getByLabelText(/answer slot 1 for answer 1/i)).toBeInTheDocument()
  })

  it('disables delete button when only 1 prompt', () => {
    setup(makeConfig(1))
    expect(screen.getByRole('button', { name: /delete prompt 1/i })).toBeDisabled()
  })
})

describe('FramedModeEditor — prompt management', () => {
  it('adds a new prompt row when "Add prompt" clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeConfig(2))

    await user.click(screen.getByTestId('add-prompt-btn'))

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FramedConfig
    expect(lastCall.prompts).toHaveLength(3)
  })

  it('deletes a prompt row', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeConfig(2))

    await user.click(screen.getByRole('button', { name: /delete prompt 2/i }))

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FramedConfig
    expect(lastCall.prompts).toHaveLength(1)
  })

  it('delete button disabled when only 1 prompt remains', () => {
    setup(makeConfig(1))
    expect(screen.getByRole('button', { name: /delete prompt 1/i })).toBeDisabled()
  })
})

describe('FramedModeEditor — frame editing', () => {
  it('updates frame text via onChange', () => {
    const { onChange } = setup(makeConfig(1))

    fireEvent.change(screen.getByRole('textbox', { name: /prompt 1 frame/i }), {
      target: { value: 'New frame {answer} here.' },
    })

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FramedConfig
    expect(lastCall.prompts[0].frame).toContain('New frame {answer} here.')
  })

  it('insert answer button appends {answer} to empty frame', async () => {
    const user = userEvent.setup()
    const config: FramedConfig = {
      prompts: [{ id: 'p1', text: '', frame: '', hint: '' }],
    }
    const { onChange } = setup(config)

    await user.click(screen.getByTestId('insert-answer-0'))

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FramedConfig
    expect(lastCall.prompts[0].frame).toContain('{answer}')
  })

  it('updates prompt label via onChange', () => {
    const { onChange } = setup(makeConfig(1))

    fireEvent.change(screen.getByRole('textbox', { name: /prompt 1 label/i }), {
      target: { value: 'New label' },
    })

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FramedConfig
    expect(lastCall.prompts[0].text).toBe('New label')
  })

  it('updates hint via onChange', () => {
    const { onChange } = setup(makeConfig(1))

    fireEvent.change(screen.getByRole('textbox', { name: /prompt 1 hint/i }), {
      target: { value: 'New hint' },
    })

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FramedConfig
    expect(lastCall.prompts[0].hint).toBe('New hint')
  })
})
