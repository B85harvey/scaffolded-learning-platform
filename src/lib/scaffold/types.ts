export type ScaffoldMode = 'framed' | 'guided' | 'freeform-table'

export interface Prompt {
  id: string
  text: string
  frame?: string
  maxLen?: number
  maxWords?: number
  hint?: string
}

export interface FreeformTableColumn {
  id: string
  label: string
  hint?: string
}

export interface FreeformTableTemplate {
  columns: FreeformTableColumn[]
  minRows?: number
  maxRows?: number
  rowLabels?: string[]
}

export interface ScaffoldConfig {
  id: string
  targetQuestion: string
  mode: ScaffoldMode
  sectionHeading?: string
  prompts?: Prompt[]
  template?: FreeformTableTemplate
  guidedJoiner?: string
}

export type Answer =
  | { promptId: string; kind: 'text'; value: string }
  | { kind: 'table-row'; values: Record<string, string> }

export type WarningCode =
  | 'EMPTY_ANSWER'
  | 'OVER_WORD_LIMIT'
  | 'OVER_CHAR_LIMIT'
  | 'MALFORMED_FRAME'
  | 'MISSING_TERMINAL_PUNCTUATION'
  | 'EMPTY_CELL'
  | 'MULTIPLE_ANSWER_TOKENS'
  | 'INSUFFICIENT_ROWS'

export interface Warning {
  level: 'info' | 'warn'
  code: WarningCode
  message: string
  promptId?: string
  rowIndex?: number
  columnId?: string
  sectionIndex?: number
}

export interface AssemblyResult {
  paragraph: string
  warnings: Warning[]
}

export interface FullDocumentSection {
  heading: string
  body: string
  mode: ScaffoldMode
}

export interface FullDocumentResult {
  markdown: string
  sections: FullDocumentSection[]
  warnings: Warning[]
}
