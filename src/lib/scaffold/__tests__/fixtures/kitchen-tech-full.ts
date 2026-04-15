import type { Answer, ScaffoldConfig, ScaffoldMode } from '../../types'
import { answers as issue1Answers, config as issue1Config } from './kitchen-tech-issues'
import { answers as decisionAnswers, config as decisionConfig } from './kitchen-tech-decision'
import { answers as implAnswers, config as implConfig } from './kitchen-tech-implementation'

// ---------------------------------------------------------------------------
// Aim (Slide 5 — Framed)
// ---------------------------------------------------------------------------

const aimConfig: ScaffoldConfig = {
  id: 'kt-aim',
  targetQuestion: 'Write the Aim for your Action Plan.',
  mode: 'framed',
  sectionHeading: 'Aim',
  prompts: [
    {
      id: 'aim-dish',
      text: 'What specific dish will your group produce? (Include every element: protein, sauce, garnish, method.)',
      frame: '{answer}',
    },
    {
      id: 'aim-tech',
      text: 'Which piece of kitchen technology have you been assigned?',
      frame: 'using the {answer}',
    },
    {
      id: 'aim-benefit',
      text: 'What is the industry relevant benefit this technology provides? (Choose one: efficiency, consistency, food safety, presentation quality, time saving.)',
      frame: 'in order to demonstrate how commercial kitchen technology can improve {answer}',
    },
    {
      id: 'aim-format',
      text: 'Which video format has your group chosen? (TikTok, Instagram reel, website video, or infomercial.)',
      frame: 'in the food and hospitality industry, documented through a {answer}.',
    },
  ],
}

const aimAnswers: Answer[] = [
  {
    promptId: 'aim-dish',
    kind: 'text',
    value:
      'The aim of this task is to produce vanilla custard French toast with whipped cream and mixed berries',
  },
  { promptId: 'aim-tech', kind: 'text', value: 'Thermomix' },
  { promptId: 'aim-benefit', kind: 'text', value: 'consistency' },
  { promptId: 'aim-format', kind: 'text', value: 'TikTok reel' },
]

// ---------------------------------------------------------------------------
// Issue 2 (Slide 9 — Framed)
// ---------------------------------------------------------------------------

const issue2Config: ScaffoldConfig = {
  id: 'kt-issue-2',
  targetQuestion: 'Write a paragraph (roughly 100 words) on your second Issue.',
  mode: 'framed',
  sectionHeading: 'Issue 2',
  prompts: [
    {
      id: 'i2-topic',
      text: 'Which issue?',
      frame: '{answer} is a significant consideration in the food and hospitality industry',
    },
    { id: 'i2-reason', text: 'Why does this matter?', frame: 'because {answer}.' },
    {
      id: 'i2-evidence',
      text: 'What evidence? Include author and year.',
      frame: 'According to {answer},',
    },
    { id: 'i2-finding', text: 'What does the evidence show?', frame: '{answer}.' },
    {
      id: 'i2-relevance',
      text: 'How is this relevant?',
      frame: 'This is relevant to this task because {answer}.',
    },
  ],
}

const issue2Answers: Answer[] = [
  { promptId: 'i2-topic', kind: 'text', value: 'Kitchen technology' },
  {
    promptId: 'i2-reason',
    kind: 'text',
    value: 'commercial operators rely on precise equipment to deliver consistent product at pace',
  },
  { promptId: 'i2-evidence', kind: 'text', value: 'Morrison and Chen (2024)' },
  {
    promptId: 'i2-finding',
    kind: 'text',
    value:
      'venues using programmable thermal equipment report a 32 percent reduction in preparation variance',
  },
  {
    promptId: 'i2-relevance',
    kind: 'text',
    value:
      'the Thermomix provides the precision temperature control needed to produce the custard to a professional standard within a tight filming window',
  },
]

// ---------------------------------------------------------------------------
// Issue 3 (Slide 10 — Framed)
// ---------------------------------------------------------------------------

const issue3Config: ScaffoldConfig = {
  id: 'kt-issue-3',
  targetQuestion: 'Write a paragraph (roughly 100 words) on your third Issue.',
  mode: 'framed',
  sectionHeading: 'Issue 3',
  prompts: [
    {
      id: 'i3-topic',
      text: 'Which issue?',
      frame: '{answer} is a significant consideration in the food and hospitality industry',
    },
    { id: 'i3-reason', text: 'Why does this matter?', frame: 'because {answer}.' },
    {
      id: 'i3-evidence',
      text: 'What evidence? Include author and year.',
      frame: 'According to {answer},',
    },
    { id: 'i3-finding', text: 'What does the evidence show?', frame: '{answer}.' },
    {
      id: 'i3-relevance',
      text: 'How is this relevant?',
      frame: 'This is relevant to this task because {answer}.',
    },
  ],
}

const issue3Answers: Answer[] = [
  { promptId: 'i3-topic', kind: 'text', value: 'Food safety' },
  {
    promptId: 'i3-reason',
    kind: 'text',
    value: 'non compliance carries direct consumer harm and legal risk',
  },
  { promptId: 'i3-evidence', kind: 'text', value: 'Food Standards Australia New Zealand (2024)' },
  {
    promptId: 'i3-finding',
    kind: 'text',
    value:
      'dairy and egg based desserts are among the highest risk categories for temperature abuse',
  },
  {
    promptId: 'i3-relevance',
    kind: 'text',
    value:
      'the dish combines custard and cream, requiring deliberate handling through the cool room and careful timing during filming to keep product out of the temperature danger zone',
  },
]

// ---------------------------------------------------------------------------
// Justification (Slide 13 — Guided, four prompts)
// ---------------------------------------------------------------------------

const justificationConfig: ScaffoldConfig = {
  id: 'kt-justification',
  targetQuestion:
    'Write the Justification paragraph (roughly 100 words) linking your Decision to each of your three Issues.',
  mode: 'guided',
  sectionHeading: 'Justification',
  prompts: [
    {
      id: 'just-trends',
      text: 'Write one sentence explaining how the dish addresses Issue 1 (food trends or similar).',
    },
    {
      id: 'just-tech',
      text: 'Write one sentence explaining how the assigned technology addresses Issue 2 (kitchen technology).',
    },
    {
      id: 'just-safety',
      text: 'Write one sentence explaining how the practical addresses Issue 3 (food safety or similar).',
    },
    {
      id: 'just-format',
      text: 'Write one sentence explaining why the chosen video format suits the audience and industry context.',
    },
  ],
}

const justificationAnswers: Answer[] = [
  {
    promptId: 'just-trends',
    kind: 'text',
    value:
      'This dish directly addresses current food trends because its visual layering and contrasting textures are well suited to short form video where the first three seconds decide viewer retention.',
  },
  {
    promptId: 'just-tech',
    kind: 'text',
    value:
      'The Thermomix was selected because its precision temperature control produces a custard of even viscosity, reflecting how commercial kitchens use programmable equipment to deliver consistent product.',
  },
  {
    promptId: 'just-safety',
    kind: 'text',
    value:
      'Food safety is maintained by holding dairy and egg products in the cool room until the filming window and sequencing the bake late in the practical to limit danger zone exposure.',
  },
  {
    promptId: 'just-format',
    kind: 'text',
    value:
      'A TikTok reel was chosen because the target audience of home cooks aged 18 to 30 engages primarily through short vertical video on that platform.',
  },
]

// ---------------------------------------------------------------------------
// Exported slides array for assembleFullDocument
// ---------------------------------------------------------------------------

export const slides: Array<{ config: ScaffoldConfig; answers: Answer[] }> = [
  { config: aimConfig, answers: aimAnswers },
  { config: issue1Config, answers: issue1Answers },
  { config: issue2Config, answers: issue2Answers },
  { config: issue3Config, answers: issue3Answers },
  { config: decisionConfig, answers: decisionAnswers },
  { config: justificationConfig, answers: justificationAnswers },
  { config: implConfig, answers: implAnswers },
]

// ---------------------------------------------------------------------------
// Expected shape (structural — full markdown is asserted via word count only)
// ---------------------------------------------------------------------------

export const expectedSections: Array<{ heading: string; mode: ScaffoldMode }> = [
  { heading: 'Aim', mode: 'framed' },
  { heading: 'Issue 1', mode: 'framed' },
  { heading: 'Issue 2', mode: 'framed' },
  { heading: 'Issue 3', mode: 'framed' },
  { heading: 'Decision', mode: 'guided' },
  { heading: 'Justification', mode: 'guided' },
  { heading: 'Implementation', mode: 'freeform-table' },
]

/** Count words in a string, splitting on whitespace. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Target word count for the assembled Action Plan (excludes the Implementation table).
 *
 * The lesson doc states 378 words, computed by a word processor. Splitting on
 * whitespace (which counts numbers, parenthetical citations etc. as tokens)
 * produces 417. The test uses 417 ± 20 to catch engine regressions while
 * acknowledging that word-counting methodology varies.
 */
export const TARGET_WORD_COUNT = 417
export const WORD_COUNT_TOLERANCE = 20
