import { useState } from 'react'
import { assemble, assembleFullDocument } from '@/lib/scaffold'
import type { Answer, AssemblyResult, ScaffoldConfig } from '@/lib/scaffold'
import * as romanEmpire from '@/lib/scaffold/__tests__/fixtures/roman-empire'
import * as ktIssues from '@/lib/scaffold/__tests__/fixtures/kitchen-tech-issues'
import * as ktDecision from '@/lib/scaffold/__tests__/fixtures/kitchen-tech-decision'
import * as ktImpl from '@/lib/scaffold/__tests__/fixtures/kitchen-tech-implementation'
import * as ktFull from '@/lib/scaffold/__tests__/fixtures/kitchen-tech-full'

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

type PresetId = 'roman-empire' | 'kt-issue-1' | 'kt-decision' | 'kt-implementation' | 'kt-full'

interface SinglePreset {
  kind: 'single'
  id: PresetId
  label: string
  config: ScaffoldConfig
  answers: Answer[]
}

interface FullPreset {
  kind: 'full'
  id: PresetId
  label: string
  slides: Array<{ config: ScaffoldConfig; answers: Answer[] }>
}

type Preset = SinglePreset | FullPreset

const PRESETS: Preset[] = [
  {
    kind: 'single',
    id: 'roman-empire',
    label: 'Roman Empire (Framed)',
    config: romanEmpire.config,
    answers: romanEmpire.answers,
  },
  {
    kind: 'single',
    id: 'kt-issue-1',
    label: 'Kitchen Tech Issue 1 (Framed)',
    config: ktIssues.config,
    answers: ktIssues.answers,
  },
  {
    kind: 'single',
    id: 'kt-decision',
    label: 'Kitchen Tech Decision (Guided)',
    config: ktDecision.config,
    answers: ktDecision.answers,
  },
  {
    kind: 'single',
    id: 'kt-implementation',
    label: 'Kitchen Tech Implementation (Freeform Table)',
    config: ktImpl.config,
    answers: ktImpl.answers,
  },
  { kind: 'full', id: 'kt-full', label: 'Kitchen Tech Full Document', slides: ktFull.slides },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function configJson(preset: SinglePreset): string {
  return JSON.stringify(preset.config, null, 2)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScaffoldPlayground() {
  const [presetId, setPresetId] = useState<PresetId>('roman-empire')
  const [configText, setConfigText] = useState(() => configJson(PRESETS[0] as SinglePreset))
  const [answers, setAnswers] = useState<Answer[]>(romanEmpire.answers)

  const activePreset = PRESETS.find((p) => p.id === presetId)!

  function handlePresetChange(id: PresetId) {
    setPresetId(id)
    const preset = PRESETS.find((p) => p.id === id)!
    if (preset.kind === 'single') {
      setConfigText(configJson(preset))
      setAnswers(preset.answers)
    } else {
      setConfigText('// Full document — see slides array in fixture')
      setAnswers([])
    }
  }

  function handleAnswerChange(promptId: string, value: string) {
    setAnswers((prev) => {
      const existing = prev.findIndex((a) => a.kind === 'text' && a.promptId === promptId)
      const next = [...prev]
      const updated: Answer = { promptId, kind: 'text', value }
      if (existing >= 0) {
        next[existing] = updated
      } else {
        next.push(updated)
      }
      return next
    })
  }

  let assemblyOutput = ''
  let assemblyWarnings: AssemblyResult['warnings'] = []
  let assemblyError: string | null = null

  try {
    if (activePreset.kind === 'full') {
      const result = assembleFullDocument(activePreset.slides)
      assemblyOutput = result.markdown
      assemblyWarnings = result.warnings
    } else {
      const parsedConfig = JSON.parse(configText) as ScaffoldConfig
      const result = assemble(parsedConfig, answers)
      assemblyOutput = result.paragraph
      assemblyWarnings = result.warnings
    }
  } catch (err) {
    assemblyError = String(err)
  }

  const promptList = activePreset.kind === 'single' ? (activePreset.config.prompts ?? []) : []

  return (
    <div
      style={{
        fontFamily: 'monospace',
        padding: '16px',
        display: 'flex',
        gap: '16px',
        height: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {/* Left pane */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '14px' }}>/_playground/scaffold</h1>

        {/* Preset selector */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
            Load preset
          </label>
          <select
            value={presetId}
            onChange={(e) => handlePresetChange(e.target.value as PresetId)}
            style={{ width: '100%', padding: '4px' }}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Config JSON editor (single presets only) */}
        {activePreset.kind === 'single' && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              ScaffoldConfig JSON
            </label>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                fontFamily: 'monospace',
                fontSize: '11px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Answer inputs */}
        {promptList.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Answers
            </label>
            {promptList.map((prompt) => {
              const currentAnswer = answers.find(
                (a) => a.kind === 'text' && a.promptId === prompt.id
              )
              const value = currentAnswer?.kind === 'text' ? currentAnswer.value : ''
              return (
                <div key={prompt.id} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>
                    [{prompt.id}] {prompt.text}
                  </div>
                  <textarea
                    value={value}
                    onChange={(e) => handleAnswerChange(prompt.id, e.target.value)}
                    style={{
                      width: '100%',
                      height: '60px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

        {activePreset.kind === 'full' && (
          <p style={{ fontSize: '12px', color: '#666' }}>
            Full document preset uses fixture answers directly. Edit fixture files to modify.
          </p>
        )}
      </div>

      {/* Right pane */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '14px' }}>Output</h2>
          <button
            onClick={() => navigator.clipboard.writeText(assemblyOutput)}
            style={{ fontSize: '11px', padding: '2px 6px' }}
          >
            Copy Markdown
          </button>
        </div>

        {assemblyError ? (
          <pre
            style={{ background: '#fee', padding: '8px', fontSize: '11px', whiteSpace: 'pre-wrap' }}
          >
            {assemblyError}
          </pre>
        ) : (
          <pre
            style={{
              background: '#f5f5f5',
              padding: '8px',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              flexGrow: 1,
            }}
          >
            {assemblyOutput || '(empty)'}
          </pre>
        )}

        {/* Warnings */}
        {assemblyWarnings.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '13px' }}>
              Warnings ({assemblyWarnings.length})
            </h3>
            {assemblyWarnings.map((w, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 8px',
                  marginBottom: '4px',
                  background: w.level === 'warn' ? '#fffbe6' : '#e6f7ff',
                  border: `1px solid ${w.level === 'warn' ? '#ffe58f' : '#91d5ff'}`,
                  fontSize: '11px',
                }}
              >
                <strong>
                  [{w.level.toUpperCase()}] {w.code}
                </strong>
                {w.sectionIndex !== undefined && (
                  <span style={{ color: '#888' }}> (section {w.sectionIndex})</span>
                )}
                {w.promptId && <span style={{ color: '#888' }}> [{w.promptId}]</span>}
                <br />
                {w.message}
              </div>
            ))}
          </div>
        )}

        {assemblyWarnings.length === 0 && !assemblyError && (
          <p style={{ fontSize: '12px', color: '#666' }}>No warnings.</p>
        )}
      </div>
    </div>
  )
}
