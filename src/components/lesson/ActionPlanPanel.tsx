import { useLesson } from '@/contexts/LessonContext'
import type { CommittedParagraph } from '@/lessons/types'

const SECTIONS: { key: string; label: string }[] = [
  { key: 'aim', label: 'Aim' },
  { key: 'issues', label: 'Issues' },
  { key: 'decision', label: 'Decision' },
  { key: 'justification', label: 'Justification' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'references', label: 'References' },
]

interface SectionBlockProps {
  label: string
  committed: CommittedParagraph | undefined
}

function SectionBlock({ label, committed }: SectionBlockProps) {
  return (
    <div>
      <h3 className="mb-3 font-sans text-base font-semibold leading-6 text-ga-ink">{label}</h3>

      {committed ? (
        <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ga-ink">
          {committed.text}
        </p>
      ) : (
        <div className="rounded-ga-md bg-ga-surface-muted px-4 py-3">
          <p className="font-sans text-sm italic text-ga-ink-muted">Not yet written</p>
        </div>
      )}
    </div>
  )
}

interface ActionPlanPanelProps {
  scribe: string
}

export function ActionPlanPanel({ scribe }: ActionPlanPanelProps) {
  const { state } = useLesson()

  return (
    <aside
      aria-label="Action Plan so far"
      className="flex h-full flex-col overflow-y-auto border-l border-ga-border-subtle bg-ga-surface px-6 py-6"
    >
      {/* Scribe chip */}
      <div className="mb-6 flex items-center gap-2 self-start rounded-full bg-ga-primary/10 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-ga-primary" aria-hidden="true" />
        <span className="font-sans text-sm font-medium text-ga-primary">Scribe: {scribe}</span>
      </div>

      {/* Section blocks */}
      <div className="flex flex-col gap-10">
        {SECTIONS.map(({ key, label }) => (
          <SectionBlock key={key} label={label} committed={state.committed[key]} />
        ))}
      </div>
    </aside>
  )
}
