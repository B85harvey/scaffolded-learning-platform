/**
 * FreeformTableEditor — scaffold freeform-table mode config editor.
 *
 * Lets the teacher define:
 * - Column headers (add/remove, minimum 1, maximum 8)
 * - Minimum row count
 * - Whether the first column is read-only (for pre-filled row labels)
 * - Row label text when the first column is read-only
 */
import { Plus, Trash2 } from 'lucide-react'
import type { FreeformTableColumn, FreeformTableTemplate } from '@/lib/scaffold/types'

export type { FreeformTableColumn, FreeformTableTemplate }

interface Props {
  template: FreeformTableTemplate
  onChange: (template: FreeformTableTemplate) => void
}

const MIN_COLS = 1
const MAX_COLS = 8

function newColumn(): FreeformTableColumn {
  return { id: crypto.randomUUID(), label: '' }
}

export function FreeformTableEditor({ template, onChange }: Props) {
  const columns = template.columns.length > 0 ? template.columns : [newColumn()]
  const minRows = template.minRows ?? 3
  const firstColReadOnly = Boolean(template.rowLabels !== undefined)
  const rowLabels = template.rowLabels ?? []

  function updateColumn(id: string, label: string) {
    onChange({
      ...template,
      columns: columns.map((c) => (c.id === id ? { ...c, label } : c)),
    })
  }

  function addColumn() {
    if (columns.length >= MAX_COLS) return
    onChange({ ...template, columns: [...columns, newColumn()] })
  }

  function removeColumn(id: string) {
    if (columns.length <= MIN_COLS) return
    const updated = columns.filter((c) => c.id !== id)
    // Remove rowLabels if first column was removed and it was the read-only one
    onChange({ ...template, columns: updated })
  }

  function updateMinRows(val: number) {
    const clamped = Math.max(1, val)
    // Sync rowLabels length if first column is read-only
    const updatedLabels = firstColReadOnly
      ? Array.from({ length: clamped }, (_, i) => rowLabels[i] ?? '')
      : undefined
    onChange({ ...template, minRows: clamped, rowLabels: updatedLabels })
  }

  function toggleFirstColReadOnly(checked: boolean) {
    if (checked) {
      // Enable — create empty labels matching minRows
      onChange({
        ...template,
        rowLabels: Array.from({ length: minRows }, (_, i) => rowLabels[i] ?? ''),
      })
    } else {
      // Disable — remove labels
      const { rowLabels: _removed, ...rest } = template
      void _removed
      onChange({ ...rest })
    }
  }

  function updateRowLabel(rowIndex: number, value: string) {
    const updated = [...rowLabels]
    updated[rowIndex] = value
    onChange({ ...template, rowLabels: updated })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Column headers ─────────────────────────────────────────────────── */}
      <section aria-label="Column headers">
        <p className="mb-2 font-sans text-xs font-medium text-ga-ink-muted">Columns</p>
        <div className="flex flex-col gap-2">
          {columns.map((col, idx) => (
            <div key={col.id} className="flex items-center gap-2" data-testid={`col-row-${idx}`}>
              <input
                type="text"
                aria-label={`Column ${idx + 1} header`}
                value={col.label}
                onChange={(e) => updateColumn(col.id, e.target.value)}
                placeholder={`Column ${idx + 1}…`}
                className="flex-1 rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
              />
              <button
                type="button"
                onClick={() => removeColumn(col.id)}
                disabled={columns.length <= MIN_COLS}
                aria-label={`Remove column ${idx + 1}`}
                className="shrink-0 rounded-ga-sm p-1 text-ga-ink-muted transition-colors hover:text-ga-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addColumn}
          disabled={columns.length >= MAX_COLS}
          data-testid="add-column-btn"
          className="mt-2 flex items-center gap-1.5 rounded-ga-sm border border-dashed border-ga-border-strong px-3 py-1.5 font-sans text-sm text-ga-ink-muted transition-colors hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={13} aria-hidden="true" />
          Add column
        </button>
      </section>

      {/* ── Min rows ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <label htmlFor="min-rows" className="shrink-0 font-sans text-sm text-ga-ink">
          Minimum rows
        </label>
        <input
          id="min-rows"
          type="number"
          value={minRows}
          min={1}
          onChange={(e) => updateMinRows(parseInt(e.target.value, 10) || 1)}
          className="w-20 rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-2.5 py-1.5 font-sans text-sm text-ga-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
        />
      </div>

      {/* ── First column read-only toggle ──────────────────────────────────── */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={firstColReadOnly}
          onChange={(e) => toggleFirstColReadOnly(e.target.checked)}
          aria-label="First column read-only"
          className="h-4 w-4 rounded border-ga-border-strong accent-ga-primary"
        />
        <span className="font-sans text-sm text-ga-ink">
          First column read-only (pre-filled row labels)
        </span>
      </label>

      {/* ── Row labels (only when first col read-only) ─────────────────────── */}
      {firstColReadOnly && (
        <section aria-label="Row labels" className="flex flex-col gap-2">
          <p className="font-sans text-xs font-medium text-ga-ink-muted">Row labels</p>
          {Array.from({ length: minRows }, (_, rowIdx) => (
            <input
              key={rowIdx}
              type="text"
              aria-label={`Row ${rowIdx + 1} label`}
              value={rowLabels[rowIdx] ?? ''}
              onChange={(e) => updateRowLabel(rowIdx, e.target.value)}
              placeholder={`Row ${rowIdx + 1} label…`}
              data-testid={`row-label-${rowIdx}`}
              className="rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
            />
          ))}
        </section>
      )}
    </div>
  )
}
