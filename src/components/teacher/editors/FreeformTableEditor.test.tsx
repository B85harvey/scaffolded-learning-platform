/**
 * FreeformTableEditor tests.
 *
 * Verifies column add/remove, min rows, and first-column read-only toggle.
 */
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FreeformTableEditor } from './FreeformTableEditor'
import type { FreeformTableTemplate } from './FreeformTableEditor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTemplate(colCount = 2, minRows = 3): FreeformTableTemplate {
  return {
    columns: Array.from({ length: colCount }, (_, i) => ({
      id: `col-${i + 1}`,
      label: `Column ${i + 1}`,
    })),
    minRows,
  }
}

function setup(template: FreeformTableTemplate = makeTemplate(), onChange = vi.fn()) {
  render(<FreeformTableEditor template={template} onChange={onChange} />)
  return { onChange }
}

// Stateful wrapper for tests that need re-rendering on onChange
function StatefulFreeformTableEditor({ initial }: { initial: FreeformTableTemplate }) {
  const [template, setTemplate] = useState(initial)
  return <FreeformTableEditor template={template} onChange={setTemplate} />
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FreeformTableEditor — columns', () => {
  it('renders one input per column', () => {
    setup(makeTemplate(3))
    expect(screen.getByRole('textbox', { name: /column 1 header/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /column 2 header/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /column 3 header/i })).toBeInTheDocument()
  })

  it('adds a column', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeTemplate(2))

    await user.click(screen.getByTestId('add-column-btn'))

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.columns).toHaveLength(3)
  })

  it('disables add column at 8 columns', () => {
    setup(makeTemplate(8))
    expect(screen.getByTestId('add-column-btn')).toBeDisabled()
  })

  it('removes a column', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeTemplate(3))

    await user.click(screen.getByRole('button', { name: /remove column 2/i }))

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.columns).toHaveLength(2)
  })

  it('disables remove when only 1 column', () => {
    setup(makeTemplate(1))
    expect(screen.getByRole('button', { name: /remove column 1/i })).toBeDisabled()
  })

  it('updates column header label', () => {
    const { onChange } = setup(makeTemplate(2))

    fireEvent.change(screen.getByRole('textbox', { name: /column 1 header/i }), {
      target: { value: 'Week' },
    })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.columns[0].label).toBe('Week')
  })
})

describe('FreeformTableEditor — min rows', () => {
  it('shows current min rows', () => {
    setup(makeTemplate(2, 4))
    expect(screen.getByRole('spinbutton', { name: /minimum rows/i })).toHaveValue(4)
  })

  it('updates min rows', () => {
    const { onChange } = setup(makeTemplate(2, 3))

    fireEvent.change(screen.getByRole('spinbutton', { name: /minimum rows/i }), {
      target: { value: '5' },
    })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.minRows).toBe(5)
  })
})

describe('FreeformTableEditor — first column read-only', () => {
  it('toggle shows row label inputs (stateful)', async () => {
    const user = userEvent.setup()
    render(<StatefulFreeformTableEditor initial={makeTemplate(2, 3)} />)

    await user.click(screen.getByRole('checkbox', { name: /first column read-only/i }))

    expect(screen.getByRole('textbox', { name: /row 1 label/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /row 2 label/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /row 3 label/i })).toBeInTheDocument()
  })

  it('toggle adds rowLabels to config', async () => {
    const user = userEvent.setup()
    const { onChange } = setup(makeTemplate(2, 3))

    await user.click(screen.getByRole('checkbox', { name: /first column read-only/i }))

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.rowLabels).toHaveLength(3)
  })

  it('un-toggling removes rowLabels from config', async () => {
    const user = userEvent.setup()
    const templateWithLabels: FreeformTableTemplate = {
      ...makeTemplate(2, 3),
      rowLabels: ['Week 1', 'Week 2', 'Week 3'],
    }
    const { onChange } = setup(templateWithLabels)

    await user.click(screen.getByRole('checkbox', { name: /first column read-only/i }))

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.rowLabels).toBeUndefined()
  })

  it('edits row label value', () => {
    const templateWithLabels: FreeformTableTemplate = {
      ...makeTemplate(2, 3),
      rowLabels: ['', '', ''],
    }
    const { onChange } = setup(templateWithLabels)

    fireEvent.change(screen.getByTestId('row-label-0'), { target: { value: 'Week 1' } })

    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as FreeformTableTemplate
    expect(last.rowLabels?.[0]).toBe('Week 1')
  })
})
