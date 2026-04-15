import type { Answer, AssemblyResult, ScaffoldConfig, Warning } from '../types'
import { emptyAnswer, missingTerminalPunctuation, overCharLimit, overWordLimit } from '../warnings'

const TERMINAL_PUNCTUATION = /[.!?]$/

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Assembles a guided-mode scaffold.
 *
 * For each prompt: finds the matching answer by promptId and uses it as a full
 * sentence. If the answer does not end with terminal punctuation (`.`, `!`, `?`),
 * a full stop is appended and a MISSING_TERMINAL_PUNCTUATION warning is emitted.
 * Missing or empty answers render as `[ ]` with an EMPTY_ANSWER warning.
 * Sentences are joined by `config.guidedJoiner` (default: single space).
 */
export function assembleGuided(config: ScaffoldConfig, answers: Answer[]): AssemblyResult {
  const prompts = config.prompts ?? []
  const joiner = config.guidedJoiner ?? ' '
  const warnings: Warning[] = []
  const sentences: string[] = []

  for (const prompt of prompts) {
    const match = answers.find((a) => a.kind === 'text' && a.promptId === prompt.id)
    const raw = match?.kind === 'text' ? match.value.trim() : ''

    if (!raw) {
      warnings.push(emptyAnswer(prompt.id))
      sentences.push('[ ]')
      continue
    }

    // Soft limit checks
    if (prompt.maxWords !== undefined) {
      const wc = countWords(raw)
      if (wc > prompt.maxWords) {
        warnings.push(overWordLimit(prompt.id, wc, prompt.maxWords))
      }
    }
    if (prompt.maxLen !== undefined) {
      if (raw.length > prompt.maxLen) {
        warnings.push(overCharLimit(prompt.id, raw.length, prompt.maxLen))
      }
    }

    if (!TERMINAL_PUNCTUATION.test(raw)) {
      warnings.push(missingTerminalPunctuation(prompt.id))
      sentences.push(raw + '.')
    } else {
      sentences.push(raw)
    }
  }

  return {
    paragraph: sentences.join(joiner).trim(),
    warnings,
  }
}
