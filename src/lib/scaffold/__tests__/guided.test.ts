import { describe, expect, it } from 'vitest'
import { assembleGuided } from '../assemblers/guided'
import type { Answer, ScaffoldConfig } from '../types'
import * as ktDecision from './fixtures/kitchen-tech-decision'

describe('assembleGuided — Kitchen Tech Decision fixture', () => {
  it('produces the correct paragraph', () => {
    const result = assembleGuided(ktDecision.config, ktDecision.answers)
    expect(result.paragraph).toBe(ktDecision.expected.paragraph)
  })

  it('returns no warnings for a valid answer with terminal punctuation', () => {
    const result = assembleGuided(ktDecision.config, ktDecision.answers)
    expect(result.warnings).toEqual([])
  })

  it('matches the full expected AssemblyResult', () => {
    const result = assembleGuided(ktDecision.config, ktDecision.answers)
    expect(result).toEqual(ktDecision.expected)
  })
})

describe('assembleGuided — terminal punctuation', () => {
  function singlePromptConfig(id: string): ScaffoldConfig {
    return {
      id: `punc-${id}`,
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [{ id, text: 'Write a sentence.' }],
    }
  }

  it('does not append a full stop when the answer ends with a full stop', () => {
    const config = singlePromptConfig('p1')
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'The sky is blue.' }]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('The sky is blue.')
    expect(result.warnings.filter((w) => w.code === 'MISSING_TERMINAL_PUNCTUATION')).toHaveLength(0)
  })

  it('does not append a full stop when the answer ends with a question mark', () => {
    const config = singlePromptConfig('p2')
    const answers: Answer[] = [{ promptId: 'p2', kind: 'text', value: 'Why is the sky blue?' }]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Why is the sky blue?')
    expect(result.warnings).toHaveLength(0)
  })

  it('does not append a full stop when the answer ends with an exclamation mark', () => {
    const config = singlePromptConfig('p3')
    const answers: Answer[] = [{ promptId: 'p3', kind: 'text', value: 'Remarkable!' }]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Remarkable!')
    expect(result.warnings).toHaveLength(0)
  })

  it('appends a full stop and emits MISSING_TERMINAL_PUNCTUATION for unpunctuated answer', () => {
    const config = singlePromptConfig('p4')
    const answers: Answer[] = [
      { promptId: 'p4', kind: 'text', value: 'The answer has no punctuation' },
    ]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('The answer has no punctuation.')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('MISSING_TERMINAL_PUNCTUATION')
    expect(result.warnings[0].promptId).toBe('p4')
    expect(result.warnings[0].level).toBe('info')
  })

  it('handles multiple sentences: only unpunctuated ones get a full stop appended', () => {
    const config: ScaffoldConfig = {
      id: 'multi-punc',
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [
        { id: 'p1', text: 'First.' },
        { id: 'p4', text: 'Second.' },
      ],
    }
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'Sentence one.' },
      { promptId: 'p4', kind: 'text', value: 'Sentence two without punctuation' },
    ]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Sentence one. Sentence two without punctuation.')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('MISSING_TERMINAL_PUNCTUATION')
  })
})

describe('assembleGuided — missing answers', () => {
  const config: ScaffoldConfig = {
    id: 'guided-missing',
    targetQuestion: 'Test.',
    mode: 'guided',
    prompts: [
      { id: 'p1', text: 'First.' },
      { id: 'p2', text: 'Second.' },
    ],
  }

  it('renders [ ] for a missing answer and emits EMPTY_ANSWER', () => {
    const result = assembleGuided(config, [])
    expect(result.paragraph).toContain('[ ]')
    expect(result.warnings.every((w) => w.code === 'EMPTY_ANSWER')).toBe(true)
    expect(result.warnings).toHaveLength(2)
  })

  it('renders [ ] for an empty string answer', () => {
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: '' }]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toContain('[ ]')
    expect(result.warnings.some((w) => w.code === 'EMPTY_ANSWER' && w.promptId === 'p1')).toBe(true)
  })

  it('includes promptId in EMPTY_ANSWER warning', () => {
    const result = assembleGuided(config, [])
    const ids = result.warnings.map((w) => w.promptId)
    expect(ids).toContain('p1')
    expect(ids).toContain('p2')
  })

  it('still assembles valid answers when some are missing', () => {
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'Complete sentence.' }]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Complete sentence. [ ]')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('EMPTY_ANSWER')
    expect(result.warnings[0].promptId).toBe('p2')
  })
})

describe('assembleGuided — custom joiner', () => {
  it('uses a custom guidedJoiner between sentences', () => {
    const config: ScaffoldConfig = {
      id: 'joined',
      targetQuestion: 'Test.',
      mode: 'guided',
      guidedJoiner: ' Additionally, ',
      prompts: [
        { id: 'p1', text: 'First.' },
        { id: 'p2', text: 'Second.' },
      ],
    }
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'The first point stands.' },
      { promptId: 'p2', kind: 'text', value: 'The second also matters.' },
    ]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('The first point stands. Additionally, The second also matters.')
  })
})

describe('assembleGuided — word and character limits', () => {
  const config: ScaffoldConfig = {
    id: 'guided-limits',
    targetQuestion: 'Test.',
    mode: 'guided',
    prompts: [{ id: 'p1', text: 'Write.', maxWords: 3, maxLen: 20 }],
  }

  it('emits OVER_WORD_LIMIT and still renders the full answer', () => {
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: 'one two three four five.' }]
    const result = assembleGuided(config, answers)
    expect(result.warnings.some((w) => w.code === 'OVER_WORD_LIMIT')).toBe(true)
    expect(result.paragraph).toContain('one two three four five.')
  })

  it('emits OVER_CHAR_LIMIT and still renders the full answer', () => {
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'This is far too long for the limit.' },
    ]
    const result = assembleGuided(config, answers)
    expect(result.warnings.some((w) => w.code === 'OVER_CHAR_LIMIT')).toBe(true)
    expect(result.paragraph).toContain('This is far too long for the limit.')
  })
})

describe('assembleGuided — edge cases', () => {
  it('handles empty prompts list', () => {
    const config: ScaffoldConfig = {
      id: 'empty',
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [],
    }
    const result = assembleGuided(config, [])
    expect(result.paragraph).toBe('')
    expect(result.warnings).toHaveLength(0)
  })

  it('trims whitespace from answers', () => {
    const config: ScaffoldConfig = {
      id: 'trim',
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [{ id: 'p1', text: 'Write.' }],
    }
    const answers: Answer[] = [{ promptId: 'p1', kind: 'text', value: '  Trimmed sentence.  ' }]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Trimmed sentence.')
    expect(result.warnings).toHaveLength(0)
  })

  it('handles special characters in answers', () => {
    const config: ScaffoldConfig = {
      id: 'special',
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [{ id: 'p1', text: 'Write.' }],
    }
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'Score was 100% — outstanding!' },
    ]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Score was 100% \u2014 outstanding!')
    expect(result.warnings).toHaveLength(0)
  })

  it('handles Unicode in answers', () => {
    const config: ScaffoldConfig = {
      id: 'unicode',
      targetQuestion: 'Test.',
      mode: 'guided',
      prompts: [{ id: 'p1', text: 'Write.' }],
    }
    const answers: Answer[] = [
      { promptId: 'p1', kind: 'text', value: 'Na\u00efve approach, r\u00e9sum\u00e9 ready.' },
    ]
    const result = assembleGuided(config, answers)
    expect(result.paragraph).toBe('Na\u00efve approach, r\u00e9sum\u00e9 ready.')
    expect(result.warnings).toHaveLength(0)
  })
})
