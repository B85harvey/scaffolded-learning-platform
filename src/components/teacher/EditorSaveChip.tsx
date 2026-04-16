/**
 * EditorSaveChip — prop-driven save status indicator for the lesson editor.
 *
 * Analogous to SaveStatusChip (which reads from SyncStatusContext) but
 * accepts the status as a prop so the editor can feed its own save state
 * without touching the student sync bus.
 */
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import type { EditorSaveStatus } from '@/hooks/useEditorAutoSave'

interface Props {
  status: EditorSaveStatus
}

export function EditorSaveChip({ status }: Props) {
  const wrap = (children: React.ReactNode, label: string) => (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid="editor-save-chip"
      className="flex items-center gap-1.5"
    >
      {children}
    </div>
  )

  if (status === 'saving') {
    return wrap(
      <>
        <Loader2 size={14} className="animate-spin text-ga-ink-muted" aria-hidden="true" />
        <span className="font-sans text-sm text-ga-ink-muted">Saving…</span>
      </>,
      'Saving…'
    )
  }

  if (status === 'saved') {
    return wrap(
      <>
        <Check size={14} className="text-ga-green" aria-hidden="true" />
        <span className="font-sans text-sm text-ga-ink-muted">Saved</span>
      </>,
      'Saved'
    )
  }

  if (status === 'error') {
    return wrap(
      <>
        <AlertTriangle size={14} className="text-ga-warning" aria-hidden="true" />
        <span className="font-sans text-sm text-ga-warning">Save failed</span>
      </>,
      'Save failed — changes may not have been stored'
    )
  }

  // idle
  return wrap(null, 'Save status')
}
