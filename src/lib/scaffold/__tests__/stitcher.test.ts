import { describe, expect, it } from 'vitest'
import { assemble, assembleFullDocument } from '../stitcher'
import type { ScaffoldConfig } from '../types'
import * as ktFull from './fixtures/kitchen-tech-full'
import * as romanEmpire from './fixtures/roman-empire'
import * as ktDecision from './fixtures/kitchen-tech-decision'
import * as ktImpl from './fixtures/kitchen-tech-implementation'

// ---------------------------------------------------------------------------
// assemble() dispatcher
// ---------------------------------------------------------------------------

describe('assemble — dispatcher', () => {
  it('routes framed mode to assembleFramed', () => {
    const result = assemble(romanEmpire.config, romanEmpire.answers)
    expect(result.paragraph).toBe(romanEmpire.expected.paragraph)
    expect(result.warnings).toEqual([])
  })

  it('routes guided mode to assembleGuided', () => {
    const result = assemble(ktDecision.config, ktDecision.answers)
    expect(result.paragraph).toBe(ktDecision.expected.paragraph)
    expect(result.warnings).toEqual([])
  })

  it('routes freeform-table mode to assembleFreeformTable', () => {
    const result = assemble(ktImpl.config, ktImpl.answers)
    expect(result.paragraph).toBe(ktImpl.expected.paragraph)
    expect(result.warnings).toEqual([])
  })

  it('throws for an unknown mode', () => {
    const config = { ...romanEmpire.config, mode: 'unknown-mode' } as unknown as ScaffoldConfig
    expect(() => assemble(config, [])).toThrow('Unknown scaffold mode')
    expect(() => assemble(config, [])).toThrow('unknown-mode')
  })
})

// ---------------------------------------------------------------------------
// assembleFullDocument()
// ---------------------------------------------------------------------------

describe('assembleFullDocument — Kitchen Tech full document', () => {
  it('returns the correct number of sections', () => {
    const result = assembleFullDocument(ktFull.slides)
    expect(result.sections).toHaveLength(ktFull.expectedSections.length)
  })

  it('section headings match expected values in order', () => {
    const result = assembleFullDocument(ktFull.slides)
    const headings = result.sections.map((s) => s.heading)
    expect(headings).toEqual(ktFull.expectedSections.map((s) => s.heading))
  })

  it('section modes match expected values in order', () => {
    const result = assembleFullDocument(ktFull.slides)
    const modes = result.sections.map((s) => s.mode)
    expect(modes).toEqual(ktFull.expectedSections.map((s) => s.mode))
  })

  it('produces no warnings when all answers are provided', () => {
    const result = assembleFullDocument(ktFull.slides)
    expect(result.warnings).toHaveLength(0)
  })

  it('total word count of text sections is within 378 ± 20 words', () => {
    const result = assembleFullDocument(ktFull.slides)
    const textBody = result.sections
      .filter((s) => s.mode !== 'freeform-table')
      .map((s) => s.body)
      .join(' ')
    const wordCount = ktFull.countWords(textBody)
    expect(wordCount).toBeGreaterThanOrEqual(ktFull.TARGET_WORD_COUNT - ktFull.WORD_COUNT_TOLERANCE)
    expect(wordCount).toBeLessThanOrEqual(ktFull.TARGET_WORD_COUNT + ktFull.WORD_COUNT_TOLERANCE)
  })

  it('markdown contains all section headings as ## headings', () => {
    const result = assembleFullDocument(ktFull.slides)
    for (const section of ktFull.expectedSections) {
      expect(result.markdown).toContain(`## ${section.heading}`)
    }
  })

  it('markdown contains the aim text', () => {
    const result = assembleFullDocument(ktFull.slides)
    expect(result.markdown).toContain('vanilla custard French toast')
  })

  it('markdown contains the implementation table header', () => {
    const result = assembleFullDocument(ktFull.slides)
    expect(result.markdown).toContain('| When | What | Why |')
  })
})

describe('assembleFullDocument — warning propagation', () => {
  it('adds sectionIndex to all warnings from each slide', () => {
    // Use slides with missing answers so warnings are generated
    const slides = [
      { config: romanEmpire.config, answers: [] }, // section 0
      { config: ktDecision.config, answers: [] }, // section 1
    ]
    const result = assembleFullDocument(slides)
    const section0Warnings = result.warnings.filter((w) => w.sectionIndex === 0)
    const section1Warnings = result.warnings.filter((w) => w.sectionIndex === 1)
    expect(section0Warnings.length).toBeGreaterThan(0)
    expect(section1Warnings.length).toBeGreaterThan(0)
  })

  it('collects warnings from all slides into a single top-level array', () => {
    const slides = [
      { config: romanEmpire.config, answers: [] },
      { config: ktDecision.config, answers: [] },
    ]
    const result = assembleFullDocument(slides)
    // Roman Empire has 4 prompts → 4 EMPTY_ANSWER; Decision has 1 → 1 EMPTY_ANSWER
    expect(result.warnings).toHaveLength(5)
  })
})

describe('assembleFullDocument — section headings fallback', () => {
  it('falls back to config.id when sectionHeading is not set', () => {
    const config: ScaffoldConfig = {
      id: 'my-section-id',
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [{ id: 'p1', text: 'Write.' }],
    }
    const result = assembleFullDocument([{ config, answers: [] }])
    expect(result.sections[0].heading).toBe('my-section-id')
    expect(result.markdown).toContain('## my-section-id')
  })
})

describe('assembleFullDocument — empty slides array', () => {
  it('returns empty markdown, sections, and warnings for no slides', () => {
    const result = assembleFullDocument([])
    expect(result.markdown).toBe('')
    expect(result.sections).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })
})

describe('assembleFullDocument — markdown structure', () => {
  it('separates sections with blank lines', () => {
    const config1: ScaffoldConfig = {
      id: 's1',
      targetQuestion: 'Test.',
      mode: 'guided',
      sectionHeading: 'Section One',
      prompts: [{ id: 'p1', text: 'Write.' }],
    }
    const config2: ScaffoldConfig = {
      id: 's2',
      targetQuestion: 'Test.',
      mode: 'guided',
      sectionHeading: 'Section Two',
      prompts: [{ id: 'p2', text: 'Write.' }],
    }
    const slides = [
      {
        config: config1,
        answers: [{ promptId: 'p1', kind: 'text' as const, value: 'First sentence.' }],
      },
      {
        config: config2,
        answers: [{ promptId: 'p2', kind: 'text' as const, value: 'Second sentence.' }],
      },
    ]
    const result = assembleFullDocument(slides)
    expect(result.markdown).toContain('## Section One\n\nFirst sentence.')
    expect(result.markdown).toContain('## Section Two\n\nSecond sentence.')
  })
})
