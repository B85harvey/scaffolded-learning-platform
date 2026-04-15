import { describe, expect, it } from 'vitest'
import { assembleFramed } from '../assemblers/framed'
import type { Answer, ScaffoldConfig } from '../types'
import * as romanEmpire from './fixtures/roman-empire'
import * as ktIssues from './fixtures/kitchen-tech-issues'

describe('assembleFramed — Roman Empire fixture', () => {
  it('produces the correct paragraph', () => {
    const result = assembleFramed(romanEmpire.config, romanEmpire.answers)
    expect(result.paragraph).toBe(romanEmpire.expected.paragraph)
  })

  it('returns no warnings for valid answers', () => {
    const result = assembleFramed(romanEmpire.config, romanEmpire.answers)
    expect(result.warnings).toEqual([])
  })

  it('matches the full expected AssemblyResult', () => {
    const result = assembleFramed(romanEmpire.config, romanEmpire.answers)
    expect(result).toEqual(romanEmpire.expected)
  })
})

describe('assembleFramed — Kitchen Tech Issue 1 fixture', () => {
  it('produces the correct paragraph', () => {
    const result = assembleFramed(ktIssues.config, ktIssues.answers)
    expect(result.paragraph).toBe(ktIssues.expected.paragraph)
  })

  it('matches the full expected AssemblyResult', () => {
    const result = assembleFramed(ktIssues.config, ktIssues.answers)
    expect(result).toEqual(ktIssues.expected)
  })
})

describe('assembleFramed — missing answers', () => {
  it('renders [ ] for a missing answer and emits EMPTY_ANSWER', () => {
    const result = assembleFramed(romanEmpire.config, [])
    expect(result.paragraph).toContain('[ ]')
    expect(result.warnings.length).toBe(4)
    expect(result.warnings.every((w) => w.code === 'EMPTY_ANSWER')).toBe(true)
  })

  it('includes the promptId in each EMPTY_ANSWER warning', () => {
    const result = assembleFramed(romanEmpire.config, [])
    const ids = result.warnings.map((w) => w.promptId)
    expect(ids).toContain('internal')
    expect(ids).toContain('external')
    expect(ids).toContain('economic')
    expect(ids).toContain('conclusion')
  })

  it('renders [ ] for a single missing answer and still assembles the rest', () => {
    const partial = romanEmpire.answers.slice(1)
    const result = assembleFramed(romanEmpire.config, partial)
    expect(result.paragraph).toContain('[ ]')
    expect(result.paragraph).toContain('repeated invasions by Germanic tribes')
    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0].code).toBe('EMPTY_ANSWER')
    expect(result.warnings[0].promptId).toBe('internal')
  })

  it('renders [ ] for an answer with empty string value', () => {
    const answers: Answer[] = [{ promptId: 'internal', kind: 'text', value: '' }]
    const result = assembleFramed(romanEmpire.config, answers)
    expect(result.paragraph).toContain('[ ]')
    expect(
      result.warnings.some((w) => w.code === 'EMPTY_ANSWER' && w.promptId === 'internal')
    ).toBe(true)
  })

  it('returns a non-empty paragraph even when all answers are missing', () => {
    const result = assembleFramed(romanEmpire.config, [])
    expect(result.paragraph.length).toBeGreaterThan(0)
  })
})

describe('assembleFramed — word and character limits', () => {
  const limitConfig: ScaffoldConfig = {
    id: 'limit-test',
    targetQuestion: 'Test limits.',
    mode: 'framed',
    prompts: [
      { id: 'p1', text: 'Short answer', frame: 'Answer: {answer}.', maxWords: 3, maxLen: 20 },
    ],
  }

  it('emits OVER_WORD_LIMIT when answer exceeds maxWords', () => {
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'one two three four five' }]
    const result = assembleFramed(limitConfig, answers)
    expect(result.warnings.some((w) => w.code === 'OVER_WORD_LIMIT')).toBe(true)
    expect(result.paragraph).toContain('one two three four five')
  })

  it('emits OVER_CHAR_LIMIT when answer exceeds maxLen', () => {
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'this is way too long for the limit' },
    ]
    const result = assembleFramed(limitConfig, answers)
    expect(result.warnings.some((w) => w.code === 'OVER_CHAR_LIMIT')).toBe(true)
    expect(result.paragraph).toContain('this is way too long for the limit')
  })

  it('does not emit limit warnings for answers within limits', () => {
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'short' }]
    const result = assembleFramed(limitConfig, answers)
    expect(
      result.warnings.filter((w) => w.code === 'OVER_WORD_LIMIT' || w.code === 'OVER_CHAR_LIMIT')
    ).toHaveLength(0)
  })
})

describe('assembleFramed — malformed frames', () => {
  const malformedConfig: ScaffoldConfig = {
    id: 'malformed-test',
    targetQuestion: 'Test.',
    mode: 'framed',
    prompts: [
      { id: 'no-token', text: 'No token in this frame.', frame: 'This frame has no placeholder.' },
    ],
  }

  it('emits MALFORMED_FRAME and appends the answer to the frame', () => {
    const answers: Answer[] = [{ promptId: 'no-token', kind: 'text', value: 'my answer' }]
    const result = assembleFramed(malformedConfig, answers)
    expect(result.warnings.some((w) => w.code === 'MALFORMED_FRAME')).toBe(true)
    expect(result.paragraph).toBe('This frame has no placeholder.my answer')
  })

  it('emits MALFORMED_FRAME and renders [ ] when answer is also missing', () => {
    const result = assembleFramed(malformedConfig, [])
    expect(result.warnings.some((w) => w.code === 'MALFORMED_FRAME')).toBe(true)
    expect(result.warnings.some((w) => w.code === 'EMPTY_ANSWER')).toBe(true)
    expect(result.paragraph).toContain('[ ]')
  })

  it('emits MULTIPLE_ANSWER_TOKENS when frame has two tokens', () => {
    const config: ScaffoldConfig = {
      id: 'multi-token',
      targetQuestion: 'Test.',
      mode: 'framed',
      prompts: [{ id: 'p1', text: 'Prompt.', frame: '{answer} and {answer} together.' }],
    }
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'cheese' }]
    const result = assembleFramed(config, answers)
    expect(result.warnings.some((w) => w.code === 'MULTIPLE_ANSWER_TOKENS')).toBe(true)
    // Suffix contains the second literal {answer} token
    expect(result.paragraph).toContain('cheese')
  })
})

describe('assembleFramed — edge cases', () => {
  it('handles prompts with no frame defined (defaults to pass-through)', () => {
    const config: ScaffoldConfig = {
      id: 'no-frame',
      targetQuestion: 'Test.',
      mode: 'framed',
      prompts: [{ id: 'p1', text: 'Write something.' }],
    }
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'hello world' }]
    // Default frame is '{answer}' so prefix='', suffix=''
    const result = assembleFramed(config, answers)
    expect(result.paragraph).toBe('hello world')
    expect(result.warnings).toHaveLength(0)
  })

  it('handles empty prompts list', () => {
    const config: ScaffoldConfig = {
      id: 'empty',
      targetQuestion: 'Test.',
      mode: 'framed',
      prompts: [],
    }
    const result = assembleFramed(config, [])
    expect(result.paragraph).toBe('')
    expect(result.warnings).toHaveLength(0)
  })

  it('handles special characters in answers', () => {
    const config: ScaffoldConfig = {
      id: 'special',
      targetQuestion: 'Test.',
      mode: 'framed',
      prompts: [{ id: 'p1', text: 'Write.', frame: 'Result: {answer}.' }],
    }
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: '50% & <strong>' }]
    const result = assembleFramed(config, answers)
    expect(result.paragraph).toBe('Result: 50% & <strong>.')
    expect(result.warnings).toHaveLength(0)
  })

  it('handles Unicode in answers', () => {
    const config: ScaffoldConfig = {
      id: 'unicode',
      targetQuestion: 'Test.',
      mode: 'framed',
      prompts: [{ id: 'p1', text: 'Write.', frame: 'Says: {answer}.' }],
    }
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'caf\u00e9 na\u00efve r\u00e9sum\u00e9' },
    ]
    const result = assembleFramed(config, answers)
    expect(result.paragraph).toBe('Says: caf\u00e9 na\u00efve r\u00e9sum\u00e9.')
    expect(result.warnings).toHaveLength(0)
  })

  it('trims whitespace from answer before inserting', () => {
    const config: ScaffoldConfig = {
      id: 'trim',
      targetQuestion: 'Test.',
      mode: 'framed',
      prompts: [{ id: 'p1', text: 'Write.', frame: 'Value: {answer}.' }],
    }
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: '  trimmed  ' }]
    const result = assembleFramed(config, answers)
    expect(result.paragraph).toBe('Value: trimmed.')
  })
})
