import type { Answer, AssemblyResult, ScaffoldConfig } from '../../types'

// Fixture for Slide 8 — Issue 1 (Framed, TEE structure).
// Used as the unit test case for the framed assembler on real lesson content.
export const config: ScaffoldConfig = {
  id: 'kt-issue-1',
  targetQuestion: 'Write a paragraph (roughly 100 words) on your first Issue.',
  mode: 'framed',
  sectionHeading: 'Issue 1',
  prompts: [
    {
      id: 'i1-topic',
      text: 'Which issue is this paragraph about? Pick one: food trends, kitchen technology, food safety, nutrition, sustainability, consumer behaviour.',
      frame: '{answer} is a significant consideration in the food and hospitality industry',
    },
    {
      id: 'i1-reason',
      text: 'Why does this issue matter to commercial kitchens or consumers? (One clause.)',
      frame: 'because {answer}.',
    },
    {
      id: 'i1-evidence',
      text: 'What specific piece of evidence supports this? Include author and year.',
      frame: 'According to {answer},',
    },
    {
      id: 'i1-finding',
      text: 'What does the evidence actually show? (Data, trend, or finding in one sentence.)',
      frame: '{answer}.',
    },
    {
      id: 'i1-relevance',
      text: 'How is this relevant to your specific dish, technology, or video format?',
      frame: 'This is relevant to this task because {answer}.',
    },
  ],
}

export const answers: Answer[] = [
  { promptId: 'i1-topic', kind: 'text', value: 'Food trends' },
  {
    promptId: 'i1-reason',
    kind: 'text',
    value:
      'consumer demand for visually appealing, shareable food content is reshaping how dishes are developed and marketed',
  },
  { promptId: 'i1-evidence', kind: 'text', value: 'Chef Collective (2025)' },
  {
    promptId: 'i1-finding',
    kind: 'text',
    value: '68 percent of Gen Z diners report choosing where to eat based on social media exposure',
  },
  {
    promptId: 'i1-relevance',
    kind: 'text',
    value:
      'the dish must be visually striking enough to perform on a short form video, which directly influenced the choice of French toast with layered cream and berries',
  },
]

export const expected: AssemblyResult = {
  paragraph:
    'Food trends is a significant consideration in the food and hospitality industry because consumer demand for visually appealing, shareable food content is reshaping how dishes are developed and marketed. According to Chef Collective (2025), 68 percent of Gen Z diners report choosing where to eat based on social media exposure. This is relevant to this task because the dish must be visually striking enough to perform on a short form video, which directly influenced the choice of French toast with layered cream and berries.',
  warnings: [],
}
