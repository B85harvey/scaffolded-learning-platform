/**
 * GuidedModeEditor — scaffold guided-mode prompt list editor.
 *
 * Renders a reorderable list of prompts (label, placeholder, optional word-count
 * target). Uses dnd-kit for drag-and-drop reordering.
 */
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

export type { Prompt }

export interface GuidedConfig {
  prompts: Prompt[]
  guidedJoiner?: string
}

interface Props {
  config: GuidedConfig
  onChange: (config: GuidedConfig) => void
}

function newPrompt(): Prompt {
  return { id: crypto.randomUUID(), text: '', hint: '' }
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prompt.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
        <input
          type="text"
          aria-label={`Prompt ${index + 1} label`}
          value={prompt.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Prompt label…"
          className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
        />
        <input
          type="text"
          aria-label={`Prompt ${index + 1} placeholder`}
          value={prompt.hint ?? ''}
          onChange={(e) => onUpdate({ hint: e.target.value })}
          placeholder="Hint text students see…"
          className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
        />
        <input
          type="number"
          aria-label={`Prompt ${index + 1} word count target`}
          value={prompt.maxWords ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
            onUpdate({ maxWords: val })
          }}
          placeholder="Max words (optional)"
          min={1}
          className="w-32 rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted px-2.5 py-1.5 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
        />
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

// ── GuidedModeEditor ──────────────────────────────────────────────────────────

export function GuidedModeEditor({ config, onChange }: Props) {
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
