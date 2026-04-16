import { useEffect, useState } from 'react'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { UNITS } from '@/lessons/units'
import type { UnitConfig } from '@/lessons/units'

// ── Types ─────────────────────────────────────────────────────────────────────

type UnitAssignmentStatus = 'draft' | 'open' | 'closed'

interface UnitRow {
  unit: UnitConfig
  status: UnitAssignmentStatus
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminUnitManager() {
  const { session } = useAuth()

  const [classId, setClassId] = useState<string | null>(null)
  const [unitRows, setUnitRows] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null) // unit id being updated
  const [confirmingClose, setConfirmingClose] = useState<string | null>(null) // unit id pending close

  const teacherId = session?.user.id ?? null

  useEffect(() => {
    if (!teacherId) return

    async function load() {
      // 1. Get the teacher's class.
      const { data: classRow } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', teacherId!)
        .maybeSingle()

      const id = classRow?.id ?? null
      setClassId(id)

      if (!id) {
        setUnitRows(UNITS.map((unit) => ({ unit, status: 'draft' })))
        setLoading(false)
        return
      }

      // 2. Fetch existing unit assignments for this class.
      const { data: assignments, error: assignErr } = await supabase
        .from('unit_assignments')
        .select('unit_id, status')
        .eq('class_id', id)

      if (assignErr) {
        setError('Could not load unit assignments.')
        setLoading(false)
        return
      }

      const statusMap = new Map(
        (assignments ?? []).map((a) => [a.unit_id, a.status as UnitAssignmentStatus])
      )

      setUnitRows(UNITS.map((unit) => ({ unit, status: statusMap.get(unit.id) ?? 'draft' })))
      setLoading(false)
    }

    void load()
  }, [teacherId])

  async function handleOpen(unitId: string) {
    if (!classId) return
    setSubmitting(unitId)

    const { error: upsertErr } = await supabase.from('unit_assignments').upsert(
      {
        unit_id: unitId,
        class_id: classId,
        status: 'open',
        opened_at: new Date().toISOString(),
      },
      { onConflict: 'unit_id,class_id' }
    )

    if (upsertErr) {
      setError(`Could not open unit: ${upsertErr.message}`)
    } else {
      setUnitRows((rows) => rows.map((r) => (r.unit.id === unitId ? { ...r, status: 'open' } : r)))
    }
    setSubmitting(null)
  }

  async function handleClose(unitId: string) {
    if (!classId) return
    setConfirmingClose(null)
    setSubmitting(unitId)

    const { error: updateErr } = await supabase
      .from('unit_assignments')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('unit_id', unitId)
      .eq('class_id', classId)

    if (updateErr) {
      setError(`Could not close unit: ${updateErr.message}`)
    } else {
      setUnitRows((rows) =>
        rows.map((r) => (r.unit.id === unitId ? { ...r, status: 'closed' } : r))
      )
    }
    setSubmitting(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SkipToContent />
      <AppNav />

      {/* Confirmation dialog */}
      {confirmingClose && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          data-testid="confirm-close-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-sm rounded-lg bg-ga-card p-6 shadow-ga-lg">
            <h2
              id="confirm-dialog-title"
              className="mb-2 font-sans text-base font-semibold text-ga-text"
            >
              Close unit?
            </h2>
            <p className="mb-6 text-sm text-ga-textMuted">
              Closing this unit will freeze student progress and make all lessons read-only. This
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="confirm-close-btn"
                onClick={() => handleClose(confirmingClose)}
                className="rounded-md bg-ga-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-danger/50 focus-visible:ring-offset-2"
              >
                Close unit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClose(null)}
                className="rounded-md border border-ga-border px-4 py-2 text-sm font-medium text-ga-text hover:border-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 font-sans text-2xl font-semibold text-ga-text">Units</h1>

          {error && (
            <p className="mb-4 text-sm text-ga-danger" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-ga-textMuted" role="status">
              Loading units…
            </p>
          ) : (
            <div className="space-y-4">
              {unitRows.map(({ unit, status }) => {
                const isBusy = submitting === unit.id

                return (
                  <div
                    key={unit.id}
                    data-testid={`unit-row-${unit.id}`}
                    className="flex items-center justify-between rounded-lg bg-ga-card p-5 shadow-card"
                  >
                    <div>
                      <p className="font-sans text-sm font-semibold text-ga-text">{unit.title}</p>
                      <p className="text-xs capitalize text-ga-textMuted">{status}</p>
                    </div>

                    <div className="flex gap-2">
                      {/* Open button — available when draft or closed */}
                      {status !== 'open' && (
                        <button
                          type="button"
                          data-testid={`open-btn-${unit.id}`}
                          aria-label={`Open ${unit.title}`}
                          disabled={isBusy}
                          onClick={() => handleOpen(unit.id)}
                          className="rounded-md bg-ga-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-ga-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                          {isBusy ? '…' : 'Open'}
                        </button>
                      )}

                      {/* Close button — available when open */}
                      {status === 'open' && (
                        <button
                          type="button"
                          data-testid={`close-btn-${unit.id}`}
                          aria-label={`Close ${unit.title}`}
                          disabled={isBusy}
                          onClick={() => setConfirmingClose(unit.id)}
                          className="rounded-md border border-ga-danger px-3 py-1.5 text-xs font-semibold text-ga-danger hover:bg-ga-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-danger/50 focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                          {isBusy ? '…' : 'Close'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
