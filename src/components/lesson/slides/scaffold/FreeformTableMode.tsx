import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLesson } from '@/contexts/LessonContext'
import type { Warning } from '@/lib/scaffold'
import type { SlideConfig } from '@/lessons/types'

type ScaffoldSlide = Extract<SlideConfig, { type: 'scaffold' }>

interface FreeformTableModeProps {
  slide: ScaffoldSlide
  warnings: Warning[]
  isCommitted: boolean
}

// ── Auto-growing cell textarea ────────────────────────────────────────────────

interface CellInputProps {
  id: string
  label: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
}

function CellInput({ id, label, value, readOnly, onChange }: CellInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight || 64, 64), 200)}px`
  }, [value])

  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={value}
        readOnly={readOnly}
        style={{ minHeight: '64px', maxHeight: '200px', overflowY: 'auto', height: '64px' }}
        className={cn(
          'w-full resize-none rounded-ga-sm border px-3 py-2 font-sans text-sm text-ga-ink',
          'focus-visible:border-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40',
          readOnly
            ? 'border-ga-border-subtle bg-ga-surface-muted text-ga-ink-muted'
            : 'border-ga-border-strong bg-white'
        )}
        onChange={(e) => {
          if (readOnly) return
          const ta = e.target
          ta.style.height = 'auto'
          ta.style.height = `${Math.min(Math.max(ta.scrollHeight || 64, 64), 200)}px`
          onChange(e.target.value)
        }}
      />
    </>
  )
}

// ── FreeformTableMode ─────────────────────────────────────────────────────────

export function FreeformTableMode({ slide, warnings, isCommitted }: FreeformTableModeProps) {
  const { state, dispatch } = useLesson()

  const template = slide.config.template
  const cols = template?.columns ?? []
  const minRows = template?.minRows ?? 1
  const rowLabels = template?.rowLabels ?? []

  const tableAnswers = state.answers[slide.id]
  const tableRows = tableAnswers?.kind === 'table' ? tableAnswers.rows : []

  // ── Row count and stable row keys ─────────────────────────────────────────

  const [rowCount, setRowCount] = useState(() => Math.max(tableRows.length, minRows))
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    Array.from({ length: Math.max(tableRows.length, minRows) }, () => crypto.randomUUID())
  )

  // ── Initialise missing rows in the reducer on mount ───────────────────────

  useEffect(() => {
    const existing = state.answers[slide.id]
    const existingRows = existing?.kind === 'table' ? existing.rows : []

    // For each row up to minRows, if the row doesn't exist in the reducer,
    // dispatch an empty value for the first editable column so the reducer
    // records the row. This ensures canCommit can evaluate tableRows.length.
    for (let rowIdx = 0; rowIdx < minRows; rowIdx++) {
      if (existingRows[rowIdx] === undefined) {
        // Find first column that is not auto-filled by rowLabels
        const firstEditableColIdx = cols.findIndex(
          (_, colIdx) => !(colIdx === 0 && rowLabels[rowIdx] !== undefined)
        )
        if (firstEditableColIdx !== -1) {
          dispatch({
            type: 'SET_TABLE_ROW',
            slideId: slide.id,
            rowIndex: rowIdx,
            columnId: cols[firstEditableColIdx].id,
            value: '',
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Add row ───────────────────────────────────────────────────────────────

  const handleAddRow = () => {
    const newRowIdx = rowCount
    setRowCount((c) => c + 1)
    setRowKeys((keys) => [...keys, crypto.randomUUID()])

    // Initialise the new row in the reducer immediately
    const firstEditableColIdx = cols.findIndex(
      (_, colIdx) => !(colIdx === 0 && rowLabels[newRowIdx] !== undefined)
    )
    if (firstEditableColIdx !== -1) {
      dispatch({
        type: 'SET_TABLE_ROW',
        slideId: slide.id,
        rowIndex: newRowIdx,
        columnId: cols[firstEditableColIdx].id,
        value: '',
      })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-ga-md border border-ga-border-subtle">
        <table className="w-full border-collapse text-left">
          {/* Column header hints below the table, so we only list column names here */}
          <thead>
            <tr className="bg-ga-surface-muted">
              {cols.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className="border-b border-ga-border-subtle px-4 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.04em] text-ga-ink-muted"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIdx) => {
              const row = tableRows[rowIdx] ?? {}
              const rowLabel = rowLabels[rowIdx]
              const rowWarnings = warnings.filter((w) => w.rowIndex === rowIdx)

              return (
                <tr
                  key={rowKeys[rowIdx]}
                  className="border-b border-ga-border-subtle last:border-0"
                >
                  {cols.map((col, colIdx) => {
                    const isAutoFilled = colIdx === 0 && rowLabel !== undefined
                    const cellValue = isAutoFilled ? rowLabel : (row[col.id] ?? '')
                    const cellLabel = rowLabel
                      ? `${rowLabel}: ${col.label}`
                      : `Row ${rowIdx + 1}: ${col.label}`
                    const cellWarnings = rowWarnings.filter((w) => w.columnId === col.id)
                    const cellId = `freeform-cell-${slide.id}-${rowIdx}-${col.id}`

                    return (
                      <td key={col.id} className="px-4 py-3 align-top">
                        <CellInput
                          id={cellId}
                          label={cellLabel}
                          value={cellValue}
                          readOnly={isCommitted || isAutoFilled}
                          onChange={(val) =>
                            dispatch({
                              type: 'SET_TABLE_ROW',
                              slideId: slide.id,
                              rowIndex: rowIdx,
                              columnId: col.id,
                              value: val,
                            })
                          }
                        />

                        {/* Cell-level warnings — shown after commit */}
                        {cellWarnings.map((w, i) => (
                          <div key={i} className="mt-1 flex items-center gap-1" aria-live="polite">
                            <AlertTriangle
                              size={12}
                              className="shrink-0 text-ga-amber-solid"
                              aria-hidden="true"
                            />
                            <p className="font-sans text-xs text-ga-amber-solid">{w.message}</p>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Column hints */}
      {cols.some((col) => col.hint) && (
        <div className="flex gap-6">
          {cols.map((col) =>
            col.hint ? (
              <p key={col.id} className="font-sans text-sm text-ga-ink-muted">
                <span className="font-medium">{col.label}:</span> {col.hint}
              </p>
            ) : null
          )}
        </div>
      )}

      {/* Add row button — hidden once committed */}
      {!isCommitted && (
        <div>
          <button
            type="button"
            onClick={handleAddRow}
            className={cn(
              'flex h-10 items-center gap-2 rounded-ga-sm border border-ga-border-strong px-4 font-sans text-sm font-medium text-ga-ink',
              'transition-colors hover:border-ga-primary hover:text-ga-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2'
            )}
          >
            <Plus size={16} aria-hidden="true" />
            Add row
          </button>
        </div>
      )}

      {/* Table-level warnings (e.g. INSUFFICIENT_ROWS) — shown after commit */}
      {warnings
        .filter((w) => w.rowIndex === undefined && w.columnId === undefined)
        .map((w, i) => (
          <div key={i} className="flex items-center gap-1.5" aria-live="polite">
            <AlertTriangle size={14} className="shrink-0 text-ga-amber-solid" aria-hidden="true" />
            <p className="font-sans text-sm text-ga-amber-solid">{w.message}</p>
          </div>
        ))}
    </div>
  )
}
