/**
 * FramedModeEditor — scaffold framed-mode prompt list editor.
 *
 * Each prompt has a sentence frame containing one or more `{answer}` tokens.
 * The editor renders one row per prompt with a frame textarea, label, hint, and
 * optional word-count target. An "Insert {answer}" button inserts the token at
 * the textarea's cursor position. A live preview below the textarea shows the
 * frame with `{answer}` rendered as highlighted chips.
 *
 * Uses dnd-kit sortable for prompt reordering.
 */
import { useRef } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Prompt } from '@/lib/scaffold/types'

export interface FramedConfig {
  prompts: Prompt[]
}

interface Props {
  config: FramedConfig
  onChange: (config: FramedConfig) => void
}

function newPrompt(): Prompt {
  return { id: crypto.randomUUID(), text: '', frame: '{answer}', hint: '' }
}

// ── Frame preview ─────────────────────────────────────────────────────────────

function FramePreview({ frame, label }: { frame: string; label: string }) {
  const parts = frame.split('{answer}')
  if (parts.length === 1) {
    return (
      <p className="font-sans text-sm italic text-ga-ink-muted">{frame || 'No frame text yet'}</p>
    )
  }
  return (
    <p className="font-sans text-sm text-ga-ink">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span
              aria-label={`Answer slot ${i + 1} for ${label}`}
              className="mx-0.5 inline-block rounded bg-ga-primary/15 px-1.5 py-0.5 font-sans text-xs font-medium text-ga-primary"
            >
              {label || `Answer ${i + 1}`}
            </span>
          )}
        </span>
      ))}
    </p>
  )
}

// ── Sortable prompt row ───────────────────────────────────────────────────────

interface PromptRowProps {
  prompt: Prompt
  index: number
  isOnly: boolean
  onUpdate: (partial: Partial<Prompt>) => void
  onDelete: () => void
}

function PromptRow({ prompt, index, isOnly, onUpdate, onDelete }: PromptRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prompt.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function insertAnswerToken() {
    const el = textareaRef.current
    if (!el) {
      onUpdate({ frame: (prompt.frame ?? '') + '{answer}' })
      return
    }
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const current = prompt.frame ?? ''
    const updated = current.slice(0, start) + '{answer}' + current.slice(end)
    onUpdate({ frame: updated })
    // Restore focus and cursor
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + 8, start + 8)
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`prompt-row-${index}`}
      className="flex items-start gap-2 rounded-ga-sm border border-ga-border-subtle bg-ga-surface p-3"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag prompt ${index + 1}`}
        className="mt-1 shrink-0 cursor-grab touch-none text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 active:cursor-grabbing"
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>

      {/* Fields */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Label */}
        <input
          type="text"
          aria-label={`Prompt ${index + 1} label`}
          value={prompt.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Answer label (e.g. Answer 1)…"
          className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
        />

        {/* Frame textarea + insert button */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <textarea
              ref={textareaRef}
              aria-label={`Prompt ${index + 1} frame`}
              value={prompt.frame ?? ''}
              onChange={(e) => onUpdate({ frame: e.target.value })}
              placeholder="Type sentence frame… use {answer} as the slot"
              rows={2}
              className="min-h-[56px] flex-1 resize-none rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-mono text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
            />
            <button
              type="button"
              onClick={insertAnswerToken}
              data-testid={`insert-answer-${index}`}
              className="mt-0.5 shrink-0 rounded-ga-sm border border-ga-border-strong px-2.5 py-1.5 font-sans text-xs text-ga-ink-muted transition-colors hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
            >
              Insert {'{answer}'}
            </button>
          </div>
          {/* Live preview */}
          <div className="rounded-ga-sm bg-ga-surface-muted px-2.5 py-1.5">
            <FramePreview frame={prompt.frame ?? ''} label={prompt.text || `Answer ${index + 1}`} />
          </div>
        </div>

        {/* Hint + max words */}
        <div className="flex gap-2">
          <input
            type="text"
            aria-label={`Prompt ${index + 1} hint`}
            value={prompt.hint ?? ''}
            onChange={(e) => onUpdate({ hint: e.target.value })}
            placeholder="Hint text…"
            className="flex-1 rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
          />
          <input
            type="number"
            aria-label={`Prompt ${index + 1} max words`}
            value={prompt.maxWords ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
              onUpdate({ maxWords: val })
            }}
            placeholder="Max words"
            min={1}
            className="w-28 rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
          />
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        disabled={isOnly}
        aria-label={`Delete prompt ${index + 1}`}
        className="mt-1 shrink-0 rounded-ga-sm p-1 text-ga-ink-muted transition-colors hover:text-ga-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── FramedModeEditor ──────────────────────────────────────────────────────────

export function FramedModeEditor({ config, onChange }: Props) {
  const prompts = config.prompts.length > 0 ? config.prompts : [newPrompt()]

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = prompts.findIndex((p) => p.id === active.id)
      const newIdx = prompts.findIndex((p) => p.id === over.id)
      onChange({ ...config, prompts: arrayMove(prompts, oldIdx, newIdx) })
    }
  }

  function addPrompt() {
    onChange({ ...config, prompts: [...prompts, newPrompt()] })
  }

  function deletePrompt(id: string) {
    if (prompts.length <= 1) return
    onChange({ ...config, prompts: prompts.filter((p) => p.id !== id) })
  }

  function updatePrompt(id: string, partial: Partial<Prompt>) {
    onChange({ ...config, prompts: prompts.map((p) => (p.id === id ? { ...p, ...partial } : p)) })
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={prompts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <ol aria-label="Prompts" className="flex flex-col gap-2">
            {prompts.map((prompt, idx) => (
              <li key={prompt.id}>
                <PromptRow
                  prompt={prompt}
                  index={idx}
                  isOnly={prompts.length === 1}
                  onUpdate={(partial) => updatePrompt(prompt.id, partial)}
                  onDelete={() => deletePrompt(prompt.id)}
                />
              </li>
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addPrompt}
        data-testid="add-prompt-btn"
        className="flex items-center gap-1.5 self-start rounded-ga-sm border border-dashed border-ga-border-strong px-3 py-1.5 font-sans text-sm text-ga-ink-muted transition-colors hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
      >
        <Plus size={13} aria-hidden="true" />
        Add prompt
      </button>
    </div>
  )
}
