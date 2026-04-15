import type { Answer, AssemblyResult, ScaffoldConfig } from '../../types'

// Fixture for Slide 15 — Implementation (Freeform table).
// Used as the unit test case for the freeform-table assembler on real lesson content.
export const config: ScaffoldConfig = {
  id: 'kt-implementation',
  targetQuestion: 'Build the Implementation table for your group.',
  mode: 'freeform-table',
  sectionHeading: 'Implementation',
  template: {
    columns: [
      { id: 'when', label: 'When' },
      { id: 'what', label: 'What' },
      { id: 'why', label: 'Why' },
    ],
    rowLabels: ['Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11'],
    minRows: 1,
  },
}

export const answers: Answer[] = [
  {
    kind: 'table-row',
    values: {
      what: 'Research Thermomix functions and commercial use cases. Decide on dish. Begin action plan draft.',
      why: 'Understanding the technology before the practical ensures the group can operate it safely and showcase its capabilities.',
    },
  },
  {
    kind: 'table-row',
    values: {
      what: 'Finalise dish. Submit food order. Draft time plan. Select TikTok format and draft storyboard. Complete action plan.',
      why: 'A detailed food order and time plan ensure the group is prepared and no ingredient or equipment is missing on cooking day.',
    },
  },
  {
    kind: 'table-row',
    values: {
      what: 'Submit action plan. Finalise mise en place list. Confirm filming schedule with roles assigned.',
      why: 'A confirmed filming schedule means key moments (Thermomix in use, final plating) are not missed during the fast paced practical.',
    },
  },
  {
    kind: 'table-row',
    values: {
      what: 'Mise en place day. Set up equipment, check Thermomix is functioning, prepare ingredients. Film prep sequences.',
      why: 'Mise en place reduces errors and time pressure on cooking day, improving food safety and product quality.',
    },
  },
  {
    kind: 'table-row',
    values: {
      what: 'Cook and plate. Film all practical stages. Upload and begin editing footage.',
      why: 'Capturing footage in real time documents the technology authentically, which is a core assessment requirement.',
    },
  },
  {
    kind: 'table-row',
    values: {
      what: 'Finalise and submit video. Complete individual evaluation. Submit whole assessment.',
      why: 'Meeting the deadline requires editing to be done before the final week, not during it.',
    },
  },
]

export const expected: AssemblyResult = {
  paragraph: [
    '| When | What | Why |',
    '| --- | --- | --- |',
    '| Week 6 | Research Thermomix functions and commercial use cases. Decide on dish. Begin action plan draft. | Understanding the technology before the practical ensures the group can operate it safely and showcase its capabilities. |',
    '| Week 7 | Finalise dish. Submit food order. Draft time plan. Select TikTok format and draft storyboard. Complete action plan. | A detailed food order and time plan ensure the group is prepared and no ingredient or equipment is missing on cooking day. |',
    '| Week 8 | Submit action plan. Finalise mise en place list. Confirm filming schedule with roles assigned. | A confirmed filming schedule means key moments (Thermomix in use, final plating) are not missed during the fast paced practical. |',
    '| Week 9 | Mise en place day. Set up equipment, check Thermomix is functioning, prepare ingredients. Film prep sequences. | Mise en place reduces errors and time pressure on cooking day, improving food safety and product quality. |',
    '| Week 10 | Cook and plate. Film all practical stages. Upload and begin editing footage. | Capturing footage in real time documents the technology authentically, which is a core assessment requirement. |',
    '| Week 11 | Finalise and submit video. Complete individual evaluation. Submit whole assessment. | Meeting the deadline requires editing to be done before the final week, not during it. |',
  ].join('\n'),
  warnings: [],
}
