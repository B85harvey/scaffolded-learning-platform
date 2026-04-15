import type { Answer, AssemblyResult, ScaffoldConfig, Warning } from '../types'
import { emptyCell, insufficientRows } from '../warnings'

/**
 * Assembles a freeform-table-mode scaffold into a Markdown table.
 *
 * Throws (programmer error) if `config.template` is missing.
 *
 * Columns come from `config.template.columns`. Rows come from answers filtered to
 * `kind: 'table-row'`. If `rowLabels` are configured, they pre-fill the first
 * column for each row. Missing or empty cells render as `[ ]` with an EMPTY_CELL
 * warning. If fewer rows than `minRows`, an INSUFFICIENT_ROWS warning is emitted
 * but existing rows are still rendered.
 */
export function assembleFreeformTable(config: ScaffoldConfig, answers: Answer[]): AssemblyResult {
  if (!config.template) {
    throw new Error(
      `assembleFreeformTable called for config "${config.id}" but config.template is missing. This is a programmer error.`
    )
  }

  const { columns, minRows = 1, rowLabels } = config.template
  const rows = answers.filter(
    (a): a is Extract<Answer, { kind: 'table-row' }> => a.kind === 'table-row'
  )
  const warnings: Warning[] = []

  if (rows.length < minRows) {
    warnings.push(insufficientRows(rows.length, minRows))
  }

  // Header row
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`
  const separator = `| ${columns.map(() => '---').join(' | ')} |`

  const dataRows = rows.map((row, rowIndex) => {
    const cells = columns.map((col, colIndex) => {
      // First column: use rowLabel if available
      if (colIndex === 0 && rowLabels && rowLabels[rowIndex] !== undefined) {
        return rowLabels[rowIndex]
      }

      const value = (row.values[col.id] ?? '').trim()
      if (!value) {
        warnings.push(emptyCell(rowIndex, col.id))
        return '[ ]'
      }
      return value
    })
    return `| ${cells.join(' | ')} |`
  })

  const markdown = [header, separator, ...dataRows].join('\n')

  return {
    paragraph: markdown,
    warnings,
  }
}
