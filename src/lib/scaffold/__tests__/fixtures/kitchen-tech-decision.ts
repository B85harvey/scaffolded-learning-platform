import type { Answer, AssemblyResult, ScaffoldConfig } from '../../types'

// Fixture for Slide 12 — Decision (Guided, single prompt).
// Used as the unit test case for the guided assembler on real lesson content.
export const config: ScaffoldConfig = {
  id: 'kt-decision',
  targetQuestion: 'State your group\u2019s Decision in one sentence.',
  mode: 'guided',
  sectionHeading: 'Decision',
  prompts: [
    {
      id: 'decision-sentence',
      text: 'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.',
    },
  ],
}

export const answers: Answer[] = [
  {
    promptId: 'decision-sentence',
    kind: 'text',
    value:
      'The group will produce vanilla custard French toast with whipped cream and mixed berries using the Thermomix, showcased through a TikTok reel targeting home cooks aged 18 to 30.',
  },
]

export const expected: AssemblyResult = {
  paragraph:
    'The group will produce vanilla custard French toast with whipped cream and mixed berries using the Thermomix, showcased through a TikTok reel targeting home cooks aged 18 to 30.',
  warnings: [],
}
