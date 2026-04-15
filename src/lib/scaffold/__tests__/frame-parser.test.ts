import { describe, expect, it } from 'vitest'
import { parseFrame } from '../frame-parser'

describe('parseFrame', () => {
  describe('single {answer} token', () => {
    it('splits prefix and suffix correctly', () => {
      const result = parseFrame('One major reason the Roman Empire fell was {answer}.')
      expect(result.prefix).toBe('One major reason the Roman Empire fell was ')
      expect(result.suffix).toBe('.')
      expect(result.warning).toBeUndefined()
    })

    it('handles token at the start of the frame', () => {
      const result = parseFrame('{answer} is a significant consideration')
      expect(result.prefix).toBe('')
      expect(result.suffix).toBe(' is a significant consideration')
      expect(result.warning).toBeUndefined()
    })

    it('handles token at the end of the frame', () => {
      const result = parseFrame('According to {answer},')
      expect(result.prefix).toBe('According to ')
      expect(result.suffix).toBe(',')
      expect(result.warning).toBeUndefined()
    })

    it('handles frame that is only the token', () => {
      const result = parseFrame('{answer}')
      expect(result.prefix).toBe('')
      expect(result.suffix).toBe('')
      expect(result.warning).toBeUndefined()
    })
  })

  describe('zero {answer} tokens (MALFORMED_FRAME)', () => {
    it('returns the whole frame as prefix with empty suffix', () => {
      const result = parseFrame('This frame has no token at all.')
      expect(result.prefix).toBe('This frame has no token at all.')
      expect(result.suffix).toBe('')
    })

    it('emits a MALFORMED_FRAME warning', () => {
      const result = parseFrame('No token here.')
      expect(result.warning).toBeDefined()
      expect(result.warning?.code).toBe('MALFORMED_FRAME')
      expect(result.warning?.level).toBe('warn')
    })

    it('includes promptId in warning when provided', () => {
      const result = parseFrame('No token here.', 'my-prompt')
      expect(result.warning?.promptId).toBe('my-prompt')
    })

    it('handles empty string frame', () => {
      const result = parseFrame('')
      expect(result.prefix).toBe('')
      expect(result.suffix).toBe('')
      expect(result.warning?.code).toBe('MALFORMED_FRAME')
    })
  })

  describe('multiple {answer} tokens (MULTIPLE_ANSWER_TOKENS)', () => {
    it('splits on the first token only', () => {
      const result = parseFrame('{answer} and {answer} are important')
      expect(result.prefix).toBe('')
      expect(result.suffix).toBe(' and {answer} are important')
    })

    it('emits a MULTIPLE_ANSWER_TOKENS warning', () => {
      const result = parseFrame('Before {answer} middle {answer} after')
      expect(result.warning).toBeDefined()
      expect(result.warning?.code).toBe('MULTIPLE_ANSWER_TOKENS')
      expect(result.warning?.level).toBe('warn')
    })

    it('includes promptId in warning when provided', () => {
      const result = parseFrame('A {answer} B {answer} C', 'p1')
      expect(result.warning?.promptId).toBe('p1')
    })

    it('suffix contains the remaining literal token text', () => {
      const result = parseFrame('Prefix {answer} middle {answer} suffix')
      expect(result.suffix).toBe(' middle {answer} suffix')
    })
  })

  describe('special characters and Unicode', () => {
    it('handles Unicode in frame text', () => {
      const result = parseFrame(
        'Additionally, {answer} placed enormous pressure on Rome\u2019s borders.'
      )
      expect(result.prefix).toBe('Additionally, ')
      expect(result.suffix).toBe(' placed enormous pressure on Rome\u2019s borders.')
      expect(result.warning).toBeUndefined()
    })

    it('handles punctuation-heavy frames', () => {
      const result = parseFrame('According to {answer},')
      expect(result.prefix).toBe('According to ')
      expect(result.suffix).toBe(',')
    })
  })
})
