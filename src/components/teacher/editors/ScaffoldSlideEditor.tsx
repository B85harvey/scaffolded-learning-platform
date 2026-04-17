/**
 * ScaffoldSlideEditor — wrapper editor for scaffold slides.
 *
 * Renders:
 * - Section assignment dropdown
 * - Target question textarea
 * - Mode picker (Framed / Guided / Freeform-table) with confirmation on switch
 * - Mode-specific editor (FramedModeEditor, GuidedModeEditor, FreeformTableEditor)
 */
import { useState } from 'react'
import type {
  ScaffoldMode,
  ScaffoldConfig,
  Prompt,
  FreeformTableTemplate,
} from '@/lib/scaffold/types'
import { FramedModeEditor } from './FramedModeEditor'
import { GuidedModeEditor } from './GuidedModeEditor'
import { FreeformTableEditor } from './FreeformTableEditor'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScaffoldSlideConfig {
  id: string
  type: 'scaffold'
  section: string
  mode: ScaffoldMode
  config: Partial<ScaffoldConfig>
}

interface Props {
  config: ScaffoldSlideConfig
  onConfigChange: (config: ScaffoldSlideConfig) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { value: 'orientation', label: 'Orientation' },
  { value: 'aim', label: 'Aim' },
  { value: 'issues', label: 'Issues' },
  { value: 'decision', label: 'Decision' },
  { value: 'justification', label: 'Justification' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'references', label: 'References' },
] as const

const MODES: { value: ScaffoldMode; label: string; description: string }[] = [
  { value: 'framed', label: 'Framed', description: 'Sentence frames with answer slots' },
  { value: 'guided', label: 'Guided', description: 'Open prompts with word targets' },
  { value: 'freeform-table', label: 'Table', description: 'Structured rows and columns' },
]

function defaultModeConfig(mode: ScaffoldMode): Partial<ScaffoldConfig> {
  if (mode === 'freeform-table') {
    return {
      template: {
        columns: [{ id: crypto.randomUUID(), label: '' }],
        minRows: 3,
      },
      prompts: undefined,
    }
  }
  return {
    prompts: [
      {
        id: crypto.randomUUID(),
        text: '',
        frame: mode === 'framed' ? '{answer}' : undefined,
        hint: '',
      } as Prompt,
    ],
    template: undefined,
  }
}

// ── ScaffoldSlideEditor ───────────────────────────────────────────────────────

export function ScaffoldSlideEditor({ config, onConfigChange }: Props) {
  const [pendingMode, setPendingMode] = useState<ScaffoldMode | null>(null)

  function update(partial: Partial<ScaffoldSlideConfig>) {
    onConfigChange({ ...config, ...partial })
  }

  function updateInnerConfig(partial: Partial<ScaffoldConfig>) {
    onConfigChange({ ...config, config: { ...config.config, ...partial } })
  }

  function handleModeSelect(mode: ScaffoldMode) {
    if (mode === config.mode) return
    // If the current mode has content, ask for confirmation
    const hasContent = hasExistingContent()
    if (hasContent) {
      setPendingMode(mode)
    } else {
      applyModeSwitch(mode)
    }
  }

  function hasExistingContent(): boolean {
    const { prompts, template } = config.config
    if (prompts && prompts.some((p) => p.text || p.hint || (p.frame && p.frame !== '{answer}'))) {
      return true
    }
    if (template?.columns.some((c) => c.label)) return true
    return false
  }

  function applyModeSwitch(mode: ScaffoldMode) {
    onConfigChange({
      ...config,
      mode,
      config: {
        ...config.config,
        mode,
        ...defaultModeConfig(mode),
      },
    })
    setPendingMode(null)
  }

  function cancelModeSwitch() {
    setPendingMode(null)
  }

  // ── Derived inner config for sub-editors ────────────────────────────────────
  const innerConfig = config.config
  const prompts: Prompt[] = innerConfig.prompts ?? []
  const template: FreeformTableTemplate = innerConfig.template ?? {
    columns: [{ id: 'col-1', label: '' }],
    minRows: 3,
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      {/* ── Mode switch confirmation dialog ──────────────────────────────────── */}
      {pendingMode !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mode-switch-title"
          data-testid="mode-switch-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-sm rounded-ga-md bg-ga-surface p-6 shadow-ga-md">
            <h2
              id="mode-switch-title"
              className="mb-2 font-sans text-base font-semibold text-ga-ink"
            >
              Switch mode?
            </h2>
            <p className="mb-6 font-sans text-sm text-ga-ink-muted">
              Switching mode will clear your current prompts. Continue?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => applyModeSwitch(pendingMode)}
                data-testid="confirm-mode-switch"
                className="flex-1 rounded-ga-sm bg-ga-primary px-4 py-2 font-sans text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={cancelModeSwitch}
                data-testid="cancel-mode-switch"
                className="flex-1 rounded-ga-sm border border-ga-border-strong px-4 py-2 font-sans text-sm text-ga-ink hover:bg-ga-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* ── Section + Mode row ──────────────────────────────────────────────── */}
        <div className="flex gap-4">
          {/* Section */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="scaffold-section"
              className="font-sans text-xs font-medium text-ga-ink-muted"
            >
              Section
            </label>
            <select
              id="scaffold-section"
              value={config.section}
              onChange={(e) => update({ section: e.target.value })}
              className="rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-2.5 py-1.5 font-sans text-sm text-ga-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
            >
              {SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mode picker */}
          <fieldset className="flex flex-col gap-1">
            <legend className="font-sans text-xs font-medium text-ga-ink-muted">Mode</legend>
            <div className="flex gap-2" role="group" aria-label="Scaffold mode">
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer flex-col rounded-ga-sm border px-3 py-2 transition-colors ${
                    config.mode === m.value
                      ? 'bg-ga-primary/8 border-ga-primary text-ga-primary'
                      : 'border-ga-border-strong bg-ga-surface text-ga-ink hover:border-ga-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scaffold-mode"
                    value={m.value}
                    checked={config.mode === m.value}
                    onChange={() => handleModeSelect(m.value)}
                    className="sr-only"
                    aria-label={m.label}
                  />
                  <span className="font-sans text-sm font-medium">{m.label}</span>
                  <span className="font-sans text-xs text-ga-ink-muted">{m.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* ── Target question ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="target-question"
            className="font-sans text-xs font-medium text-ga-ink-muted"
          >
            Target question
          </label>
          <textarea
            id="target-question"
            value={innerConfig.targetQuestion ?? ''}
            onChange={(e) => updateInnerConfig({ targetQuestion: e.target.value })}
            placeholder="What question should students answer?"
            rows={2}
            className="resize-none rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-3 py-2 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
          />
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────────── */}
        <hr className="border-ga-border-subtle" />

        {/* ── Mode-specific editor ─────────────────────────────────────────────── */}
        {config.mode === 'framed' && (
          <FramedModeEditor
            config={{ prompts }}
            onChange={(c) => updateInnerConfig({ prompts: c.prompts })}
          />
        )}
        {config.mode === 'guided' && (
          <GuidedModeEditor
            config={{ prompts, guidedJoiner: innerConfig.guidedJoiner }}
            onChange={(c) =>
              updateInnerConfig({ prompts: c.prompts, guidedJoiner: c.guidedJoiner })
            }
          />
        )}
        {config.mode === 'freeform-table' && (
          <FreeformTableEditor
            template={template}
            onChange={(t) => updateInnerConfig({ template: t })}
          />
        )}
      </div>
    </div>
  )
}
