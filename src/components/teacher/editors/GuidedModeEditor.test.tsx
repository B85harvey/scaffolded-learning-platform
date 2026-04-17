/**
 * GuidedModeEditor tests.
 *
 * Verifies prompt add/delete, single-remaining guard, and config propagation.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuidedModeEditor } from './GuidedModeEditor'
import type { GuidedConfig } from './GuidedModeEditor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(promptCount = 3): GuidedConfig {
  return {
    prompts: Array.from({ length: promptCount }, (_, i) => ({
      id: `p${i + 1}`,
      text: `Prompt ${i + 1}`,
      hint: `Hint ${i + 1}`,
    })),
  }
}

function setup(config: GuidedConfig = makeConfig(), onChange = vi.fn()) {
  render(<GuidedModeEditor config={config} onChange={onChange} />)
  return { onChange }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GuidedModeEditor — rendering', () => {
  it('renders one row per prompt', () => {
    setup(makeConfig(3))
    expect(screen.getByTestId('prompt-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-row-2')).toBeInTheDocument()
  })

  it('shows Add prompt button', () => {
    setup()
    expect(screen.getByTestId('add-prompt-btn')).toBeInTheDocument()
  })
})

describe('GuidedModeEditor — prompt management', () => {
  it('adds a prompt — config gains a row', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeConfig(2))

    await user.click(screen.getByTestId('add-prompt-btn'))

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GuidedConfig
    expect(last.prompts).toHaveLength(3)
  })

  it('deletes a prompt — config loses a row', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeConfig(3))

    await user.click(screen.getByRole('button', { name: /delete prompt 3/i }))

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GuidedConfig
    expect(last.prompts).toHaveLength(2)
  })

  it('delete button disabled when only 1 prompt', () => {
    setup(makeConfig(1))
    expect(screen.getByRole('button', { name: /delete prompt 1/i })).toBeDisabled()
  })
})

describe('GuidedModeEditor — field updates', () => {
  it('updates label text', () => {
    const { onChange } = setup(makeConfig(2))

    fireEvent.change(screen.getByRole('textbox', { name: /prompt 1 label/i }), {
      target: { value: 'New label' },
    })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GuidedConfig
    expect(last.prompts[0].text).toBe('New label')
  })

  it('updates placeholder/hint text', () => {
    const { onChange } = setup(makeConfig(2))

    fireEvent.change(screen.getByRole('textbox', { name: /prompt 1 placeholder/i }), {
      target: { value: 'Write something here' },
    })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GuidedConfig
    expect(last.prompts[0].hint).toBe('Write something here')
  })

  it('updates max words', () => {
    const { onChange } = setup(makeConfig(1))

    fireEvent.change(screen.getByRole('spinbutton', { name: /prompt 1 word count target/i }), {
      target: { value: '30' },
    })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GuidedConfig
    expect(last.prompts[0].maxWords).toBe(30)
  })

  it('clearing max words sets undefined', () => {
    const config = makeConfig(1)
    config.prompts[0].maxWords = 20
    const { onChange } = setup(config)

    fireEvent.change(screen.getByRole('spinbutton', { name: /prompt 1 word count target/i }), {
      target: { value: '' },
    })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GuidedConfig
    expect(last.prompts[0].maxWords).toBeUndefined()
  })
})

describe('GuidedModeEditor — drag handles rendered', () => {
  it('renders a drag handle per prompt', () => {
    setup(makeConfig(3))
    expect(screen.getByLabelText(/drag prompt 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/drag prompt 2/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/drag prompt 3/i)).toBeInTheDocument()
  })
})
