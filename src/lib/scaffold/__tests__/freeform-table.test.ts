import { describe, expect, it } from 'vitest'
import { assembleFreeformTable } from '../assemblers/freeform-table'
import type { Answer, ScaffoldConfig } from '../types'
import * as ktImpl from './fixtures/kitchen-tech-implementation'

describe('assembleFreeformTable — Kitchen Tech Implementation fixture', () => {
  it('produces the correct Markdown table', () => {
    const result = assembleFreeformTable(ktImpl.config, ktImpl.answers)
    expect(result.paragraph).toBe(ktImpl.expected.paragraph)
  })

  it('returns no warnings for a fully populated table', () => {
    const result = assembleFreeformTable(ktImpl.config, ktImpl.answers)
    expect(result.warnings).toEqual([])
  })

  it('matches the full expected AssemblyResult', () => {
    const result = assembleFreeformTable(ktImpl.config, ktImpl.answers)
    expect(result).toEqual(ktImpl.expected)
  })

  it('starts with the correct Markdown table header', () => {
    const result = assembleFreeformTable(ktImpl.config, ktImpl.answers)
    expect(result.paragraph.startsWith('| When | What | Why |')).toBe(true)
  })

  it('has a separator row as the second line', () => {
    const result = assembleFreeformTable(ktImpl.config, ktImpl.answers)
    const lines = result.paragraph.split('\n')
    expect(lines[1]).toBe('| --- | --- | --- |')
  })

  it('uses rowLabels for the first column', () => {
    const result = assembleFreeformTable(ktImpl.config, ktImpl.answers)
    expect(result.paragraph).toContain('| Week 6 |')
    expect(result.paragraph).toContain('| Week 11 |')
  })
})

describe('assembleFreeformTable — missing template throws', () => {
  it('throws when config.template is missing', () => {
    const config: ScaffoldConfig = {
      id: 'no-template',
      targetQuestion: 'Test.',
      mode: 'freeform-table',
    }
    expect(() => assembleFreeformTable(config, [])).toThrow()
  })

  it('throw message mentions the config id', () => {
    const config: ScaffoldConfig = {
      id: 'my-config',
      targetQuestion: 'Test.',
      mode: 'freeform-table',
    }
    expect(() => assembleFreeformTable(config, [])).toThrow('my-config')
  })
})

describe('assembleFreeformTable — missing cells', () => {
  const config: ScaffoldConfig = {
    id: 'cells',
    targetQuestion: 'Test.',
    mode: 'freeform-table',
    template: {
      columns: [
        { id: 'col-a', label: 'Column A' },
        { id: 'col-b', label: 'Column B' },
      ],
      minRows: 1,
    },
  }

  it('renders [ ] for a missing cell value and emits EMPTY_CELL', () => {
    const answers: Answer[] = [{ kind: 'table-row', values: { 'col-a': 'filled' } }]
    const result = assembleFreeformTable(config, answers)
    expect(result.paragraph).toContain('[ ]')
    expect(result.warnings.some((w) => w.code === 'EMPTY_CELL')).toBe(true)
  })

  it('includes the columnId in the EMPTY_CELL warning', () => {
    const answers: Answer[] = [{ kind: 'table-row', values: { 'col-a': 'filled' } }]
    const result = assembleFreeformTable(config, answers)
    const warn = result.warnings.find((w) => w.code === 'EMPTY_CELL')
    expect(warn?.columnId).toBe('col-b')
  })

  it('includes the rowIndex in the EMPTY_CELL warning', () => {
    const answers: Answer[] = [
      { kind: 'table-row', values: { 'col-a': 'r0a', 'col-b': 'r0b' } },
      { kind: 'table-row', values: { 'col-a': 'r1a' } },
    ]
    const result = assembleFreeformTable(config, answers)
    const warn = result.warnings.find((w) => w.code === 'EMPTY_CELL')
    expect(warn?.rowIndex).toBe(1)
  })

  it('emits EMPTY_CELL for an explicitly empty string value', () => {
    const answers: Answer[] = [{ kind: 'table-row', values: { 'col-a': '', 'col-b': 'present' } }]
    const result = assembleFreeformTable(config, answers)
    expect(result.warnings.some((w) => w.code === 'EMPTY_CELL' && w.columnId === 'col-a')).toBe(
      true
    )
  })
})

describe('assembleFreeformTable — minRows warning', () => {
  const config: ScaffoldConfig = {
    id: 'minrows',
    targetQuestion: 'Test.',
    mode: 'freeform-table',
    template: {
      columns: [{ id: 'col-a', label: 'A' }],
      minRows: 3,
    },
  }

  it('emits INSUFFICIENT_ROWS when there are fewer rows than minRows', () => {
    const answers: Answer[] = [{ kind: 'table-row', values: { 'col-a': 'val' } }]
    const result = assembleFreeformTable(config, answers)
    expect(result.warnings.some((w) => w.code === 'INSUFFICIENT_ROWS')).toBe(true)
  })

  it('still renders the existing rows when emitting INSUFFICIENT_ROWS', () => {
    const answers: Answer[] = [{ kind: 'table-row', values: { 'col-a': 'only row' } }]
    const result = assembleFreeformTable(config, answers)
    expect(result.paragraph).toContain('only row')
  })

  it('does not emit INSUFFICIENT_ROWS when rows equal minRows', () => {
    const answers: Answer[] = [
      { kind: 'table-row', values: { 'col-a': 'r1' } },
      { kind: 'table-row', values: { 'col-a': 'r2' } },
      { kind: 'table-row', values: { 'col-a': 'r3' } },
    ]
    const result = assembleFreeformTable(config, answers)
    expect(result.warnings.some((w) => w.code === 'INSUFFICIENT_ROWS')).toBe(false)
  })

  it('does not emit INSUFFICIENT_ROWS when there are zero rows if minRows is 1 (default)', () => {
    const configMinDefault: ScaffoldConfig = {
      id: 'min-default',
      targetQuestion: 'Test.',
      mode: 'freeform-table',
      template: { columns: [{ id: 'a', label: 'A' }] },
    }
    const result = assembleFreeformTable(configMinDefault, [])
    expect(result.warnings.some((w) => w.code === 'INSUFFICIENT_ROWS')).toBe(true)
  })
})

describe('assembleFreeformTable — rowLabels with missing answer rows', () => {
  it('only renders as many rows as there are table-row answers', () => {
    const config: ScaffoldConfig = {
      id: 'labels',
      targetQuestion: 'Test.',
      mode: 'freeform-table',
      template: {
        columns: [
          { id: 'when', label: 'When' },
          { id: 'what', label: 'What' },
        ],
        rowLabels: ['Week 1', 'Week 2', 'Week 3'],
        minRows: 1,
      },
    }
    const answers: Answer[] = [{ kind: 'table-row', values: { what: 'Do something.' } }]
    const result = assembleFreeformTable(config, answers)
    expect(result.paragraph).toContain('Week 1')
    expect(result.paragraph).not.toContain('Week 2')
    expect(result.paragraph).not.toContain('Week 3')
  })
})

describe('assembleFreeformTable — non-table-row answers are ignored', () => {
  it('filters out text-kind answers', () => {
    const config: ScaffoldConfig = {
      id: 'filter',
      targetQuestion: 'Test.',
      mode: 'freeform-table',
      template: {
        columns: [{ id: 'a', label: 'A' }],
        minRows: 1,
      },
    }
    const answers: Answer[] = [
      { promptId: 'irrelevant', kind: 'text', value: 'should be ignored' },
      { kind: 'table-row', values: { a: 'row value' } },
    ]
    const result = assembleFreeformTable(config, answers)
    expect(result.paragraph).toContain('row value')
    expect(result.paragraph).not.toContain('should be ignored')
  })
})

describe('assembleFreeformTable — table structure', () => {
  it('renders the correct number of data rows', () => {
    const config: ScaffoldConfig = {
      id: 'rows',
      targetQuestion: 'Test.',
      mode: 'freeform-table',
      template: { columns: [{ id: 'a', label: 'A' }], minRows: 1 },
    }
    const answers: Answer[] = [
      { kind: 'table-row', values: { a: 'r1' } },
      { kind: 'table-row', values: { a: 'r2' } },
      { kind: 'table-row', values: { a: 'r3' } },
    ]
    const result = assembleFreeformTable(config, answers)
    const lines = result.paragraph.split('\n')
    // header + separator + 3 data rows = 5 lines
    expect(lines).toHaveLength(5)
  })
})
