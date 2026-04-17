/**
 * ReferenceBuilder tests.
 *
 * Verifies:
 *   - Website fields are visible by default (URL, Accessed).
 *   - Book type hides URL/Accessed and shows Publisher label.
 *   - Journal type shows Volume, Issue, and Pages fields.
 *   - Live preview updates as fields are filled.
 *   - Add Reference calls the onAdd handler with formatted citation.
 *   - Form clears after adding (type retained).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReferenceBuilder } from './ReferenceBuilder'

function renderBuilder(onAdd = vi.fn()) {
  return { onAdd, ...render(<ReferenceBuilder onAdd={onAdd} />) }
}

describe('ReferenceBuilder', () => {
  it('shows URL and Accessed fields for Website type by default', () => {
    renderBuilder()
    expect(screen.getByLabelText('URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Accessed')).toBeInTheDocument()
  })

  it('switches to Book: hides URL and Accessed, shows Publisher label', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await user.selectOptions(screen.getByLabelText('Type'), 'book')

    expect(screen.queryByLabelText('URL')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Accessed')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Publisher')).toBeInTheDocument()
  })

  it('switches to Journal: shows Volume, Issue, and Pages fields', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await user.selectOptions(screen.getByLabelText('Type'), 'journal')

    expect(screen.getByLabelText('Volume')).toBeInTheDocument()
    expect(screen.getByLabelText('Issue')).toBeInTheDocument()
    expect(screen.getByLabelText('Pages')).toBeInTheDocument()
  })

  it('live preview updates as fields are filled', async () => {
    const user = userEvent.setup()
    renderBuilder()

    expect(screen.queryByTestId('citation-preview')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Author(s)'), 'Smith, J.')
    await user.type(screen.getByLabelText('Year'), '2023')
    await user.type(screen.getByLabelText('Title'), 'How to cook')

    const preview = screen.getByTestId('citation-preview')
    expect(preview).toBeInTheDocument()
    expect(preview.textContent).toContain('Smith, J.')
    expect(preview.textContent).toContain('2023')
    expect(preview.textContent).toContain('How to cook')
  })

  it('Add Reference calls onAdd with formatted citation', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderBuilder()

    await user.type(screen.getByLabelText('Author(s)'), 'Jones, A.')
    await user.type(screen.getByLabelText('Year'), '2021')
    await user.type(screen.getByLabelText('Title'), 'Cooking basics')

    await user.click(screen.getByTestId('add-reference-btn'))

    expect(onAdd).toHaveBeenCalledOnce()
    const citation = onAdd.mock.calls[0][0] as string
    expect(citation).toContain('Jones, A.')
    expect(citation).toContain('2021')
    expect(citation).toContain('Cooking basics')
  })

  it('clears fields after adding but retains the selected type', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await user.selectOptions(screen.getByLabelText('Type'), 'book')
    await user.type(screen.getByLabelText('Author(s)'), 'Taylor, R.')
    await user.type(screen.getByLabelText('Year'), '2020')
    await user.type(screen.getByLabelText('Title'), 'Nutrition guide')
    await user.type(screen.getByLabelText('Publisher'), 'Health Press')

    await user.click(screen.getByTestId('add-reference-btn'))

    expect(screen.getByLabelText<HTMLInputElement>('Author(s)').value).toBe('')
    expect(screen.getByLabelText<HTMLInputElement>('Year').value).toBe('')
    expect(screen.getByLabelText<HTMLInputElement>('Title').value).toBe('')
    expect(screen.getByLabelText<HTMLSelectElement>('Type').value).toBe('book')
  })
})
