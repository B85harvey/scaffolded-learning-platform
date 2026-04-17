/**
 * ScaffoldSlideEditor tests.
 *
 * Verifies mode switching (with confirmation dialog) and section assignment.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScaffoldSlideEditor } from './ScaffoldSlideEditor'
import type { ScaffoldSlideConfig } from './ScaffoldSlideEditor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<ScaffoldSlideConfig> = {}): ScaffoldSlideConfig {
  return {
    id: 'slide-s1',
    type: 'scaffold',
    section: 'orientation',
    mode: 'framed',
    config: {
      prompts: [{ id: 'p1', text: 'Answer 1', frame: 'The answer is {answer}.', hint: '' }],
    },
    ...overrides,
  }
}

function setup(config = makeConfig(), onConfigChange = vi.fn()) {
  render(<ScaffoldSlideEditor config={config} onConfigChange={onConfigChange} />)
  return { onConfigChange }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScaffoldSlideEditor — mode switching', () => {
  it('shows current mode as selected', () => {
    setup(makeConfig({ mode: 'guided' }))
    const radio = screen.getByRole('radio', { name: /guided/i })
    expect(radio).toBeChecked()
  })

  it('switching mode with existing content shows confirmation dialog', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('radio', { name: /guided/i }))

    expect(screen.getByTestId('mode-switch-dialog')).toBeInTheDocument()
  })

  it('cancelling mode switch does NOT update config', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup()

    await user.click(screen.getByRole('radio', { name: /guided/i }))
    await user.click(screen.getByTestId('cancel-mode-switch'))

    expect(screen.queryByTestId('mode-switch-dialog')).not.toBeInTheDocument()
    expect(onConfigChange).not.toHaveBeenCalled()
  })

  it('confirming mode switch calls onConfigChange with new mode', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup()

    await user.click(screen.getByRole('radio', { name: /guided/i }))
    await user.click(screen.getByTestId('confirm-mode-switch'))

    expect(screen.queryByTestId('mode-switch-dialog')).not.toBeInTheDocument()
    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'guided' }))
  })

  it('switching to same mode does nothing', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup(makeConfig({ mode: 'framed' }))

    await user.click(screen.getByRole('radio', { name: /framed/i }))

    expect(screen.queryByTestId('mode-switch-dialog')).not.toBeInTheDocument()
    expect(onConfigChange).not.toHaveBeenCalled()
  })

  it('switching mode on empty config switches immediately without dialog', async () => {
    const user = userEvent.setup()
    const emptyConfig: ScaffoldSlideConfig = {
      id: 'slide-s2',
      type: 'scaffold',
      section: 'orientation',
      mode: 'guided',
      config: { prompts: [{ id: 'p1', text: '', hint: '' }] },
    }
    const { onConfigChange } = setup(emptyConfig)

    await user.click(screen.getByRole('radio', { name: /framed/i }))

    expect(screen.queryByTestId('mode-switch-dialog')).not.toBeInTheDocument()
    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ mode: 'framed' }))
  })
})

describe('ScaffoldSlideEditor — section', () => {
  it('shows the current section in the dropdown', () => {
    setup(makeConfig({ section: 'issues' }))
    expect(screen.getByRole('combobox')).toHaveValue('issues')
  })

  it('changing section calls onConfigChange with new section', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = setup(makeConfig({ section: 'orientation' }))

    await user.selectOptions(screen.getByRole('combobox'), 'issues')

    expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ section: 'issues' }))
  })

  it('shows all section options', () => {
    setup()
    const options = screen.getAllByRole('option')
    const values = options.map((o) => (o as HTMLOptionElement).value)
    expect(values).toContain('aim')
    expect(values).toContain('issues')
    expect(values).toContain('decision')
    expect(values).toContain('justification')
    expect(values).toContain('implementation')
  })
})

describe('ScaffoldSlideEditor — target question', () => {
  it('updates target question via onConfigChange', () => {
    const config = makeConfig()
    config.config.targetQuestion = ''
    const { onConfigChange } = setup(config)

    fireEvent.change(screen.getByRole('textbox', { name: /target question/i }), {
      target: { value: 'What is technology?' },
    })

    expect(onConfigChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ targetQuestion: 'What is technology?' }),
      })
    )
  })
})

describe('ScaffoldSlideEditor — freeform-table mode', () => {
  it('renders FreeformTableEditor when mode is freeform-table', () => {
    setup(
      makeConfig({
        mode: 'freeform-table',
        config: {
          template: { columns: [{ id: 'c1', label: 'Week' }], minRows: 3 },
        },
      })
    )
    expect(screen.getByRole('button', { name: /add column/i })).toBeInTheDocument()
  })
})
