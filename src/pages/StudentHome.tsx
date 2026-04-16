import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { AppNav } from '@/components/AppNav'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { calcUnitCompletion } from '@/lib/completionCalc'
import { getUnitById } from '@/lessons/units'
import type { UnitConfig } from '@/lessons/units'

// ── Types ─────────────────────────────────────────────────────────────────────

type UnitStatus = 'open' | 'closed'

interface UnitRow {
  unit: UnitConfig
  status: UnitStatus
  completion: number // 0–100
}

// ── UnitCard ──────────────────────────────────────────────────────────────────

interface UnitCardProps {
  row: UnitRow
}

function UnitCard({ row }: UnitCardProps) {
  const { unit, status, completion } = row
  const isClosed = status === 'closed'

  const card = (
    <div
      data-testid={`unit-card-${unit.id}`}
      className={[
        'rounded-lg bg-ga-card p-6 shadow-card transition-shadow',
        isClosed ? 'opacity-60' : 'hover:shadow-card-hover',
      ].join(' ')}
    >
      {/* Title + badge row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-sans text-base font-semibold text-ga-text">{unit.title}</h2>
        {isClosed && (
          <span
            data-testid="closed-badge"
            className="shrink-0 rounded-full bg-ga-border px-2.5 py-0.5 text-xs font-medium text-ga-textMuted"
          >
            Closed
          </span>
        )}
      </div>

      {/* Lesson count */}
      <p className="mb-4 text-sm text-ga-textMuted">
        {unit.lessonIds.length} {unit.lessonIds.length === 1 ? 'lesson' : 'lessons'}
      </p>

      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between text-xs text-ga-textMuted">
        <span>Completion</span>
        <span data-testid="completion-pct">{completion}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={completion}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${unit.title} completion: ${completion}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-ga-border"
      >
        <div
          className="h-full rounded-full bg-ga-primary transition-all"
          style={{ width: `${completion}%` }}
        />
      </div>
    </div>
  )

  if (isClosed) {
    return (
      <div title="This unit is closed" aria-disabled="true">
        {card}
      </div>
    )
  }

  return (
    <Link
      to={`/unit/${unit.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-blue/50 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  )
}

// ── StudentHome ───────────────────────────────────────────────────────────────

export function StudentHome() {
  const { session, profile } = useAuth()

  const [units, setUnits] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const displayName = profile?.display_name ?? session?.user.email ?? ''
  const studentId = session?.user.id ?? null

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        // 1. Resolve this student's class.
        const { data: membership } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', studentId!)
          .maybeSingle()

        const classId = membership?.class_id
        if (!classId) {
          setUnits([])
          setLoading(false)
          return
        }

        // 2. Fetch unit assignments for this class (all statuses).
        const { data: assignments, error: assignErr } = await supabase
          .from('unit_assignments')
          .select('unit_id, status')
          .eq('class_id', classId)

        if (assignErr) {
          setError('Could not load unit assignments.')
          setLoading(false)
          return
        }

        // 3. Filter out drafts and match with registry.
        const visible = (assignments ?? []).filter((a) => a.status !== 'draft')
        const rows: UnitRow[] = []

        await Promise.all(
          visible.map(async (a) => {
            const unit = getUnitById(a.unit_id)
            if (!unit) return

            const completion = await calcUnitCompletion(studentId!, unit.id)
            rows.push({ unit, status: a.status as UnitStatus, completion })
          })
        )

        // Sort by unit id for stable display order.
        rows.sort((a, b) => a.unit.id.localeCompare(b.unit.id))
        setUnits(rows)
      } catch {
        setError('Something went wrong loading your units.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [studentId])

  return (
    <>
      <SkipToContent />
      <AppNav />
      <main id="main" className="min-h-screen bg-ga-bg px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 font-sans text-2xl font-semibold text-ga-text">
            Welcome back{displayName ? `, ${displayName}` : ''}
          </h1>

          {loading && (
            <p className="text-sm text-ga-textMuted" role="status" aria-live="polite">
              Loading your units…
            </p>
          )}

          {error && (
            <p className="text-sm text-ga-danger" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && units.length === 0 && (
            <p data-testid="empty-state" className="text-sm text-ga-textMuted">
              No units available yet. Your teacher will open them when it's time.
            </p>
          )}

          {!loading && !error && units.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2">
              {units.map((row) => (
                <UnitCard key={row.unit.id} row={row} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
