import { Fragment, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useLesson } from '@/contexts/LessonContext'
import { SHORTCUTS } from '@/lib/shortcuts'

/**
 * Keyboard shortcut reference dialog.
 *
 * Uses a native <dialog> element opened with showModal() so the browser handles
 * the backdrop and focus trap. Mount/unmount this component based on
 * `state.ui.shortcutsOpen` — the dialog opens via showModal() on mount so
 * Escape and backdrop-click work natively.
 *
 * Triggered by pressing "?" anywhere except inside a text input (wired in
 * LessonShell). Closed by the × button, the backdrop, or Escape.
 */
export function ShortcutHelpDialog() {
  const { dispatch } = useLesson()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open as a modal on mount so the browser provides backdrop + focus trap
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const close = () => dispatch({ type: 'CLOSE_SHORTCUTS' })

  return (
    <dialog
      ref={dialogRef}
      data-testid="shortcut-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          close()
        }
      }}
      onCancel={(e) => {
        // Prevent the browser from closing the dialog natively — we update state instead
        e.preventDefault()
        close()
      }}
      className="m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-ga-lg p-0 shadow-ga-md backdrop:bg-black/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ga-border-subtle px-6 py-4">
        <h2 className="font-sans text-base font-semibold text-ga-ink">Keyboard shortcuts</h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close keyboard shortcuts"
          className="rounded-ga-sm p-1 text-ga-ink-muted transition-colors hover:text-ga-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Shortcut grid */}
      <div className="px-6 py-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
          {SHORTCUTS.map((shortcut) => (
            <Fragment key={shortcut.key}>
              <dt>
                <kbd className="inline-flex items-center rounded bg-ga-surface-muted px-2 py-0.5 font-mono text-sm text-ga-ink">
                  {shortcut.key}
                </kbd>
              </dt>
              <dd className="font-sans text-sm leading-6 text-ga-ink-muted">
                {shortcut.description}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </dialog>
  )
}
