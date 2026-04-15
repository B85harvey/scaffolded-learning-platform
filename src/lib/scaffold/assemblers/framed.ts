import type { Answer, AssemblyResult, ScaffoldConfig, Warning } from '../types'
import { parseFrame } from '../frame-parser'
import { emptyAnswer, overCharLimit, overWordLimit } from '../warnings'

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Assembles a framed-mode scaffold.
 *
 * For each prompt: finds the matching answer by promptId, parses the frame into
 * prefix and suffix, then renders `prefix + answer + suffix`. Missing or empty
 * answers render as `[ ]` with an EMPTY_ANSWER warning. Soft limits on word and
 * character count emit warnings but never truncate.
 */
export function assembleFramed(config: ScaffoldConfig, answers: Answer[]): AssemblyResult {
  const prompts = config.prompts ?? []
  const warnings: Warning[] = []
  const sentences: string[] = []

  for (const prompt of prompts) {
    const frame = prompt.frame ?? '{answer}'
    const parsed = parseFrame(frame, prompt.id)

    if (parsed.warning) {
      warnings.push(parsed.warning)
    }

    const match = answers.find((a) => a.kind === 'text' && a.promptId === prompt.id)
    const raw = match?.kind === 'text' ? match.value.trim() : ''

    if (!raw) {
      warnings.push(emptyAnswer(prompt.id))
      if (parsed.warning?.code === 'MALFORMED_FRAME') {
        // No {answer} token: frame IS the sentence, append placeholder
        sentences.push(parsed.prefix + '[ ]')
      } else {
        sentences.push(parsed.prefix + '[ ]' + parsed.suffix)
      }
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

    if (parsed.warning?.code === 'MALFORMED_FRAME') {
      // Append answer to the frame (the whole frame is the prefix)
      sentences.push(parsed.prefix + raw)
    } else {
      sentences.push(parsed.prefix + raw + parsed.suffix)
    }
  }

  return {
    paragraph: sentences.join(' ').trim(),
    warnings,
  }
}
