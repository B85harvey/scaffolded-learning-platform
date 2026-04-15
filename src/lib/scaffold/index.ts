// Public API for the scaffold engine.
// Phase 2 components import from here, never from internal modules directly.

export type {
  Answer,
  AssemblyResult,
  FreeformTableColumn,
  FreeformTableTemplate,
  FullDocumentResult,
  FullDocumentSection,
  Prompt,
  ScaffoldConfig,
  ScaffoldMode,
  Warning,
  WarningCode,
} from './types'

export { parseFrame } from './frame-parser'
export type { ParsedFrame } from './frame-parser'

export { assembleFramed } from './assemblers/framed'
export { assembleGuided } from './assemblers/guided'
export { assembleFreeformTable } from './assemblers/freeform-table'

export { assemble, assembleFullDocument } from './stitcher'

export { sanitiseAnswer } from './sanitise'
