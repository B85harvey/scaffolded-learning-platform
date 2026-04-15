import type { Warning, WarningCode } from './types'

export function makeWarning(
  code: WarningCode,
  level: Warning['level'],
  message: string,
  extra?: Partial<Omit<Warning, 'code' | 'level' | 'message'>>
): Warning {
  return { code, level, message, ...extra }
}

export function emptyAnswer(promptId: string): Warning {
  return makeWarning('EMPTY_ANSWER', 'warn', `No answer provided for prompt "${promptId}".`, {
    promptId,
  })
}

export function overWordLimit(promptId: string, count: number, limit: number): Warning {
  return makeWarning(
    'OVER_WORD_LIMIT',
    'warn',
    `Answer for "${promptId}" is ${count} words (limit ${limit}).`,
    { promptId }
  )
}

export function overCharLimit(promptId: string, count: number, limit: number): Warning {
  return makeWarning(
    'OVER_CHAR_LIMIT',
    'warn',
    `Answer for "${promptId}" is ${count} characters (limit ${limit}).`,
    { promptId }
  )
}

export function malformedFrame(promptId: string): Warning {
  return makeWarning(
    'MALFORMED_FRAME',
    'warn',
    `Frame for prompt "${promptId}" contains no {answer} token. Answer will be appended.`,
    { promptId }
  )
}

export function multipleAnswerTokens(promptId: string): Warning {
  return makeWarning(
    'MULTIPLE_ANSWER_TOKENS',
    'warn',
    `Frame for prompt "${promptId}" contains more than one {answer} token. Using the first.`,
    { promptId }
  )
}

export function missingTerminalPunctuation(promptId: string): Warning {
  return makeWarning(
    'MISSING_TERMINAL_PUNCTUATION',
    'info',
    `Answer for "${promptId}" did not end with terminal punctuation. A full stop was appended.`,
    { promptId }
  )
}

export function emptyCell(rowIndex: number, columnId: string): Warning {
  return makeWarning(
    'EMPTY_CELL',
    'warn',
    `Cell at row ${rowIndex + 1}, column "${columnId}" is empty.`,
    { rowIndex, columnId }
  )
}

export function insufficientRows(actual: number, min: number): Warning {
  return makeWarning(
    'INSUFFICIENT_ROWS',
    'warn',
    `Table has ${actual} row(s) but minRows is ${min}.`
  )
}
