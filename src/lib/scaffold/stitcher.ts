import type {
  Answer,
  AssemblyResult,
  FullDocumentResult,
  FullDocumentSection,
  ScaffoldConfig,
  Warning,
} from './types'
import { assembleFramed } from './assemblers/framed'
import { assembleGuided } from './assemblers/guided'
import { assembleFreeformTable } from './assemblers/freeform-table'

/**
 * Dispatches to the correct mode assembler based on `config.mode`.
 *
 * Throws (programmer error) if `config.mode` is not a known ScaffoldMode.
 */
export function assemble(config: ScaffoldConfig, answers: Answer[]): AssemblyResult {
  switch (config.mode) {
    case 'framed':
      return assembleFramed(config, answers)
    case 'guided':
      return assembleGuided(config, answers)
    case 'freeform-table':
      return assembleFreeformTable(config, answers)
    default: {
      // TypeScript narrows `config.mode` to `never` here — this only runs at
      // runtime if the caller passes an unknown mode string.
      const exhaustive: never = config.mode
      throw new Error(`Unknown scaffold mode: "${String(exhaustive)}". This is a programmer error.`)
    }
  }
}

/**
 * Assembles a full document from an ordered list of scaffold slides.
 *
 * Each slide is run through `assemble()`. The outputs are stitched together
 * with Markdown `##` headings (using each config's `sectionHeading`, falling
 * back to `config.id`). All warnings from every slide are collected and
 * annotated with a `sectionIndex` before being merged into the top-level
 * `warnings` array.
 */
export function assembleFullDocument(
  slides: Array<{ config: ScaffoldConfig; answers: Answer[] }>
): FullDocumentResult {
  const sections: FullDocumentSection[] = []
  const warnings: Warning[] = []

  for (let i = 0; i < slides.length; i++) {
    const { config, answers } = slides[i]
    const result = assemble(config, answers)

    const heading = config.sectionHeading ?? config.id

    sections.push({
      heading,
      body: result.paragraph,
      mode: config.mode,
    })

    for (const w of result.warnings) {
      warnings.push({ ...w, sectionIndex: i })
    }
  }

  const markdown = sections.map((s) => `## ${s.heading}\n\n${s.body}`).join('\n\n')

  return { markdown, sections, warnings }
}
