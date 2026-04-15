import type { Warning } from './types'
import { makeWarning } from './warnings'

const TOKEN = '{answer}'

export interface ParsedFrame {
  prefix: string
  suffix: string
  warning?: Warning
}

/**
 * Splits a sentence frame on the first {answer} token.
 *
 * - Zero tokens → returns { prefix: frame, suffix: '' } with a MALFORMED_FRAME warning.
 * - One token   → returns { prefix, suffix } with no warning.
 * - Multiple tokens → splits on the first, returns { prefix, suffix } with a
 *   MULTIPLE_ANSWER_TOKENS warning. The suffix will contain the remaining literal
 *   '{answer}' text unchanged.
 */
export function parseFrame(frame: string, promptId?: string): ParsedFrame {
  const index = frame.indexOf(TOKEN)

  if (index === -1) {
    return {
      prefix: frame,
      suffix: '',
      warning: makeWarning(
        'MALFORMED_FRAME',
        'warn',
        promptId
          ? `Frame for prompt "${promptId}" contains no {answer} token. Answer will be appended.`
          : 'Frame contains no {answer} token. Answer will be appended.',
        promptId ? { promptId } : undefined
      ),
    }
  }

  const prefix = frame.slice(0, index)
  const suffix = frame.slice(index + TOKEN.length)

  if (suffix.includes(TOKEN)) {
    return {
      prefix,
      suffix,
      warning: makeWarning(
        'MULTIPLE_ANSWER_TOKENS',
        'warn',
        promptId
          ? `Frame for prompt "${promptId}" contains more than one {answer} token. Using the first.`
          : 'Frame contains more than one {answer} token. Using the first.',
        promptId ? { promptId } : undefined
      ),
    }
  }

  return { prefix, suffix }
}
