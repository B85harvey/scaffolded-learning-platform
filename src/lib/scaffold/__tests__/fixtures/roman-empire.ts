import type { Answer, AssemblyResult, ScaffoldConfig } from '../../types'

export const config: ScaffoldConfig = {
  id: 'roman-empire',
  targetQuestion: 'Explain why the Roman Empire fell.',
  mode: 'framed',
  sectionHeading: 'The Fall of Rome',
  prompts: [
    {
      id: 'internal',
      text: 'What is one major reason the Empire weakened internally?',
      frame: 'One major reason the Roman Empire fell was {answer}.',
    },
    {
      id: 'external',
      text: 'What external pressure contributed to the fall?',
      frame: 'Additionally, {answer} placed enormous pressure on Rome\u2019s borders.',
    },
    {
      id: 'economic',
      text: 'How did economic factors play a role?',
      frame: 'The economy also suffered because {answer}.',
    },
    {
      id: 'conclusion',
      text: 'Summarise: why did Rome fall?',
      frame: 'In conclusion, {answer}.',
    },
  ],
}

export const answers: Answer[] = [
  { promptId: 'internal', kind: 'text', value: 'corruption and political instability' },
  { promptId: 'external', kind: 'text', value: 'repeated invasions by Germanic tribes' },
  {
    promptId: 'economic',
    kind: 'text',
    value: 'taxes were too high and trade routes were disrupted',
  },
  {
    promptId: 'conclusion',
    kind: 'text',
    value: 'a combination of internal weakness and external threats brought down the Empire',
  },
]

export const expected: AssemblyResult = {
  paragraph:
    'One major reason the Roman Empire fell was corruption and political instability. Additionally, repeated invasions by Germanic tribes placed enormous pressure on Rome\u2019s borders. The economy also suffered because taxes were too high and trade routes were disrupted. In conclusion, a combination of internal weakness and external threats brought down the Empire.',
  warnings: [],
}
