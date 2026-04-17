/**
 * LessonEditor — two-panel lesson editing page at /teacher/lessons/:lessonId/edit.
 *
 * Left panel (280px): sortable slide list sidebar with drag-and-drop reordering.
 * Right panel (flex-1): Edit / Preview tabs + slide-specific editor.
 *
 * State design:
 * - `slides` array is the single source of truth for ordering and configs.
 * - `selectedSlideId` drives which editor is shown.
 * - `currentConfig` is derived: slides.find(id)?.config (no setState in effects).
 * - `useEditorAutoSave` watches currentConfig and debounces Supabase writes.
 * - Lesson title has its own debounced save (separate from slide config).
 * - `activeTab` switches between 'edit' and 'preview' without clearing state.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, FileText, GripVertical, HelpCircle, PenLine, Plus, Trash2 } from 'lucide-react'
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
import { TeacherLayout } from '@/components/teacher/TeacherLayout'
import { EditorSaveChip } from '@/components/teacher/EditorSaveChip'
import { SlidePreview } from '@/components/teacher/SlidePreview'
import { ContentSlideEditor } from '@/components/teacher/editors/ContentSlideEditor'
import type { ContentConfig } from '@/components/teacher/editors/ContentSlideEditor'
import { McqSlideEditor } from '@/components/teacher/editors/McqSlideEditor'
import type { McqConfig } from '@/components/teacher/editors/McqSlideEditor'
import { ScaffoldSlideEditor } from '@/components/teacher/editors/ScaffoldSlideEditor'
import type { ScaffoldSlideConfig } from '@/components/teacher/editors/ScaffoldSlideEditor'
import { useEditorAutoSave } from '@/hooks/useEditorAutoSave'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditorSlide {
  id: string
  sort_order: number
  type: 'content' | 'mcq' | 'scaffold' | 'review'
  config: Record<string, unknown>
}

type SlideType = EditorSlide['type']

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type: SlideType) {
  switch (type) {
    case 'content':
      return <FileText size={15} aria-hidden="true" />
    case 'mcq':
      return <HelpCircle size={15} aria-hidden="true" />
    case 'scaffold':
      return <PenLine size={15} aria-hidden="true" />
    case 'review':
      return <Eye size={15} aria-hidden="true" />
  }
}

function typeLabel(type: SlideType): string {
  const map: Record<SlideType, string> = {
    content: 'Content',
    mcq: 'MCQ',
    scaffold: 'Scaffold',
    review: 'Review',
  }
  return map[type]
}

function defaultConfig(type: SlideType): Record<string, unknown> {
  const id = crypto.randomUUID()
  switch (type) {
    case 'content':
      return { id, type: 'content', section: 'orientation', title: '', body: '' }
    case 'mcq':
      return {
        id,
        type: 'mcq',
        section: 'orientation',
        variant: 'self',
        question: '',
        options: [
          { id: 'a', text: '', correct: false },
          { id: 'b', text: '', correct: false },
        ],
      }
    case 'scaffold':
      return {
        id,
        type: 'scaffold',
        section: 'orientation',
        mode: 'guided',
        config: { prompts: [{ id: crypto.randomUUID(), text: '', hint: '' }] },
      }
    case 'review':
      return { id, type: 'review', section: 'review' }
  }
}

function slideLabel(slide: EditorSlide): string {
  const cfg = slide.config
  if (slide.type === 'content') {
    const title = cfg.title as string | undefined
    const body = cfg.body as string | undefined
    if (title) return title
    if (body) return body.slice(0, 40) + (body.length > 40 ? '…' : '')
    return 'Empty slide'
  }
  if (slide.type === 'mcq') {
    const q = cfg.question as string | undefined
    if (q) return q.slice(0, 40) + (q.length > 40 ? '…' : '')
    return 'Empty question'
  }
  if (slide.type === 'scaffold') {
    const inner = cfg.config as { targetQuestion?: string } | undefined
    if (inner?.targetQuestion) return inner.targetQuestion.slice(0, 40)
  }
  return typeLabel(slide.type)
}

// ── Sortable slide row ────────────────────────────────────────────────────────

interface SortableSlideRowProps {
  slide: EditorSlide
  index: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function SortableSlideRow({ slide, index, isSelected, onSelect, onDelete }: SortableSlideRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full items-center gap-1 pr-1 transition-colors ${
        isSelected ? 'bg-ga-primary/8' : 'hover:bg-ga-surface-muted'
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag slide ${index + 1} to reorder`}
        data-testid={`drag-handle-${index}`}
        className="shrink-0 cursor-grab touch-none px-1 py-2 text-ga-ink-muted opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none active:cursor-grabbing group-hover:opacity-100"
      >
        <GripVertical size={13} aria-hidden="true" />
      </button>

      {/* Slide row (select) */}
      <button
        type="button"
        onClick={onSelect}
        data-testid={`slide-row-${index}`}
        aria-current={isSelected ? 'true' : undefined}
        className={`flex min-w-0 flex-1 items-center gap-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ga-primary/50 ${
          isSelected ? 'text-ga-primary' : 'text-ga-ink'
        }`}
      >
        <span
          className={`shrink-0 ${isSelected ? 'text-ga-primary' : 'text-ga-ink-muted'}`}
          aria-label={typeLabel(slide.type)}
        >
          {typeIcon(slide.type)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-xs font-medium">
            {index + 1}. {slideLabel(slide)}
          </span>
          <span className="block font-sans text-xs text-ga-ink-muted">{typeLabel(slide.type)}</span>
        </span>
      </button>

      {/* Delete */}
      <button
        type="button"
        aria-label={`Delete slide ${index + 1}`}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        data-testid={`delete-slide-${index}`}
        className="shrink-0 rounded-ga-sm p-1 text-ga-ink-muted opacity-0 transition-opacity hover:text-ga-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 group-hover:opacity-100"
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LessonEditor() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()

  const [slides, setSlides] = useState<EditorSlide[]>([])
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EditorSlide | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const addMenuRef = useRef<HTMLDivElement>(null)

  // ── Derived config (no setState in effects) ────────────────────────────────
  const currentSlide = slides.find((s) => s.id === selectedSlideId) ?? null
  const currentConfig = currentSlide?.config ?? {}

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const saveStatus = useEditorAutoSave({
    lessonId: lessonId ?? '',
    slideId: selectedSlideId ?? '',
    config: currentConfig,
  })

  // ── Load lesson + slides ───────────────────────────────────────────────────
  useEffect(() => {
    if (!lessonId) return

    let active = true

    Promise.all([
      supabase.from('lessons').select('id, title').eq('id', lessonId).maybeSingle(),
      supabase
        .from('slides')
        .select('id, sort_order, type, config')
        .eq('lesson_id', lessonId)
        .order('sort_order', { ascending: true }),
    ])
      .then(([lessonRes, slidesRes]) => {
        if (!active) return
        if (lessonRes.error) throw lessonRes.error
        if (slidesRes.error) throw slidesRes.error
        if (!lessonRes.data) {
          setError('Lesson not found')
          setLoading(false)
          return
        }

        setLessonTitle(lessonRes.data.title)
        const loaded = (slidesRes.data ?? []).map((row) => ({
          id: row.id,
          sort_order: row.sort_order,
          type: row.type as SlideType,
          config: (row.config as Record<string, unknown>) ?? {},
        }))
        setSlides(loaded)
        if (loaded.length > 0) setSelectedSlideId(loaded[0].id)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load lesson')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [lessonId])

  // ── Click-outside to close add-slide menu ──────────────────────────────────
  useEffect(() => {
    if (!addMenuOpen) return

    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [addMenuOpen])

  // ── Title auto-save ────────────────────────────────────────────────────────
  const titleSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTitleChange(value: string) {
    setLessonTitle(value)
    if (titleSaveRef.current) clearTimeout(titleSaveRef.current)
    titleSaveRef.current = setTimeout(() => {
      void supabase
        .from('lessons')
        .update({ title: value, updated_at: new Date().toISOString() })
        .eq('id', lessonId ?? '')
    }, 1_200)
  }

  // ── Config change ──────────────────────────────────────────────────────────
  const handleConfigChange = useCallback(
    (newConfig: Record<string, unknown>) => {
      setSlides((prev) =>
        prev.map((s) => (s.id === selectedSlideId ? { ...s, config: newConfig } : s))
      )
    },
    [selectedSlideId]
  )

  // ── Drag-and-drop slide reorder ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = slides.findIndex((s) => s.id === active.id)
    const newIdx = slides.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(slides, oldIdx, newIdx).map((s, i) => ({
      ...s,
      sort_order: i + 1,
    }))
    setSlides(reordered)

    // Batch-update sort_order in Supabase
    void Promise.all(
      reordered.map((s) =>
        supabase.from('slides').update({ sort_order: s.sort_order }).eq('id', s.id)
      )
    )
  }

  // ── Add slide ──────────────────────────────────────────────────────────────
  async function handleAddSlide(type: SlideType) {
    if (!lessonId) return
    setAddMenuOpen(false)

    const nextOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 1
    const cfg = defaultConfig(type)

    const { data, error: insertErr } = await supabase
      .from('slides')
      .insert({
        lesson_id: lessonId,
        sort_order: nextOrder,
        type,
        config: cfg as Json,
      })
      .select('id, sort_order, type, config')
      .single()

    if (insertErr || !data) return

    const newSlide: EditorSlide = {
      id: data.id,
      sort_order: data.sort_order,
      type: data.type as SlideType,
      config: (data.config as Record<string, unknown>) ?? {},
    }

    setSlides((prev) => [...prev, newSlide])
    setSelectedSlideId(newSlide.id)
  }

  // ── Delete slide ───────────────────────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    const { error: deleteErr } = await supabase.from('slides').delete().eq('id', deleteTarget.id)

    setDeleting(false)

    if (deleteErr) return

    const remaining = slides.filter((s) => s.id !== deleteTarget.id)
    setSlides(remaining)

    if (selectedSlideId === deleteTarget.id) {
      setSelectedSlideId(remaining.length > 0 ? remaining[0].id : null)
    }

    setDeleteTarget(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <TeacherLayout>
        <div
          data-testid="lesson-editor-skeleton"
          aria-busy="true"
          aria-label="Loading editor…"
          className="flex h-[calc(100vh-3rem)] items-center justify-center"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ga-border-subtle border-t-ga-primary" />
        </div>
      </TeacherLayout>
    )
  }

  if (error) {
    return (
      <TeacherLayout>
        <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
          <p className="font-sans text-sm text-ga-ink-muted">{error}</p>
        </div>
      </TeacherLayout>
    )
  }

  return (
    <TeacherLayout>
      {/* ── Delete confirmation dialog ──────────────────────────────────── */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-slide-title"
          data-testid="delete-confirm-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-sm rounded-ga-md bg-ga-surface p-6 shadow-ga-md">
            <h2
              id="delete-slide-title"
              className="mb-2 font-sans text-base font-semibold text-ga-ink"
            >
              Delete this slide?
            </h2>
            <p className="mb-6 font-sans text-sm text-ga-ink-muted">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                data-testid="confirm-delete-btn"
                className="rounded-ga-sm bg-ga-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-danger/50 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-ga-sm border border-ga-border-subtle px-4 py-2 text-sm font-medium text-ga-ink hover:border-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-testid="lesson-editor" className="flex h-[calc(100vh-3rem)] overflow-hidden">
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside
          aria-label="Slide list"
          className="flex w-[280px] shrink-0 flex-col border-r border-ga-border-subtle bg-ga-surface"
        >
          {/* Slide list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {slides.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="font-sans text-sm text-ga-ink-muted">
                  Add your first slide to get started.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={slides.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol aria-label="Slides" className="py-2" data-testid="slide-list">
                    {slides.map((slide, idx) => (
                      <li key={slide.id}>
                        <SortableSlideRow
                          slide={slide}
                          index={idx}
                          isSelected={slide.id === selectedSlideId}
                          onSelect={() => setSelectedSlideId(slide.id)}
                          onDelete={() => setDeleteTarget(slide)}
                        />
                      </li>
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Add slide button */}
          <div className="border-t border-ga-border-subtle p-3" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen((v) => !v)}
              data-testid="add-slide-btn"
              aria-haspopup="true"
              aria-expanded={addMenuOpen}
              className="flex w-full items-center justify-center gap-2 rounded-ga-sm border border-dashed border-ga-border-strong px-4 py-2 text-sm text-ga-ink-muted transition-colors hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
            >
              <Plus size={14} aria-hidden="true" />
              Add slide
            </button>

            {addMenuOpen && (
              <div
                role="menu"
                data-testid="add-slide-menu"
                className="absolute bottom-16 left-3 right-3 z-20 overflow-hidden rounded-ga-sm border border-ga-border-subtle bg-ga-surface shadow-ga-md"
              >
                {(
                  [
                    { type: 'content' as const, label: 'Content' },
                    { type: 'mcq' as const, label: 'MCQ' },
                    { type: 'scaffold' as const, label: 'Scaffold' },
                    { type: 'review' as const, label: 'Review' },
                  ] satisfies Array<{ type: SlideType; label: string }>
                ).map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    role="menuitem"
                    data-testid={`add-${type}-slide`}
                    onClick={() => void handleAddSlide(type)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ga-ink hover:bg-ga-surface-muted focus-visible:bg-ga-surface-muted focus-visible:outline-none"
                  >
                    <span className="text-ga-ink-muted">{typeIcon(type)}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Editor panel ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Panel header: title + tabs + save chip */}
          <div className="flex h-12 shrink-0 items-center gap-4 border-b border-ga-border-subtle bg-ga-surface px-6">
            <input
              type="text"
              aria-label="Lesson title"
              value={lessonTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-sans text-base font-semibold text-ga-ink focus-visible:outline-none"
              placeholder="Untitled Lesson"
              data-testid="lesson-title-input"
            />

            {/* Edit / Preview tabs (only when a slide is selected) */}
            {currentSlide && (
              <div
                role="tablist"
                aria-label="Editor tabs"
                className="flex rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'edit'}
                  onClick={() => setActiveTab('edit')}
                  data-testid="tab-edit"
                  className={`rounded-l-ga-sm px-3 py-1 font-sans text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 ${
                    activeTab === 'edit'
                      ? 'bg-ga-surface font-medium text-ga-ink shadow-sm'
                      : 'text-ga-ink-muted hover:text-ga-ink'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'preview'}
                  onClick={() => setActiveTab('preview')}
                  data-testid="tab-preview"
                  className={`rounded-r-ga-sm px-3 py-1 font-sans text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 ${
                    activeTab === 'preview'
                      ? 'bg-ga-surface font-medium text-ga-ink shadow-sm'
                      : 'text-ga-ink-muted hover:text-ga-ink'
                  }`}
                >
                  Preview
                </button>
              </div>
            )}

            <EditorSaveChip status={saveStatus} />
            <button
              type="button"
              onClick={() => navigate('/teacher/lessons')}
              className="shrink-0 rounded-ga-sm px-3 py-1.5 text-sm text-ga-ink-muted hover:text-ga-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
            >
              Done
            </button>
          </div>

          {/* Slide editor / preview */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {currentSlide === null ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-sans text-sm text-ga-ink-muted">
                  Select a slide to start editing.
                </p>
              </div>
            ) : activeTab === 'preview' ? (
              <SlidePreview
                key={currentSlide.id}
                slideType={currentSlide.type}
                config={currentSlide.config}
              />
            ) : currentSlide.type === 'content' ? (
              <ContentSlideEditor
                key={currentSlide.id}
                config={currentSlide.config as unknown as ContentConfig}
                lessonId={lessonId ?? ''}
                onConfigChange={(cfg) =>
                  handleConfigChange(cfg as unknown as Record<string, unknown>)
                }
              />
            ) : currentSlide.type === 'mcq' ? (
              <McqSlideEditor
                key={currentSlide.id}
                config={currentSlide.config as unknown as McqConfig}
                onConfigChange={(cfg) =>
                  handleConfigChange(cfg as unknown as Record<string, unknown>)
                }
              />
            ) : currentSlide.type === 'scaffold' ? (
              <ScaffoldSlideEditor
                key={currentSlide.id}
                config={currentSlide.config as unknown as ScaffoldSlideConfig}
                onConfigChange={(cfg) =>
                  handleConfigChange(cfg as unknown as Record<string, unknown>)
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="font-sans text-sm text-ga-ink-muted">
                  {typeLabel(currentSlide.type)} slide editor coming in Phase 5.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TeacherLayout>
  )
}
