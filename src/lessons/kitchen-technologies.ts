import type { LessonConfig } from './types'

const lesson: LessonConfig = {
  id: 'kitchen-technologies',
  title: 'Unit 2 Kitchen Technologies: Writing the Group Action Plan',
  scribe: 'Alex Chen',
  slides: [
    // ── Slide 1 ── Content: Orientation ────────────────────────────────────
    {
      id: 'slide-01-orientation',
      type: 'content',
      section: 'orientation',
      title: 'Welcome to the Action Plan lesson',
      body: `This lesson walks your group through writing the Action Plan for Unit 2 Kitchen Technologies. By the end you will have a complete 400 word Action Plan ready to copy across into your submission document.

You already know the task: produce a dish using an assigned kitchen technology and document it in a video. Your group has already been told which piece of technology you have been given. Keep it in mind as you work through the prompts.`,
    },

    // ── Slide 2 ── Content: The Rules ───────────────────────────────────────
    {
      id: 'slide-02-rules',
      type: 'content',
      section: 'orientation',
      title: 'Four rules for your Action Plan',
      body: `Four rules apply to everything you write in this Action Plan:

1. **400 words maximum.** Tables do not count.
2. **Present tense.** The practical has not happened yet.
3. **Formal and objective.** No *I*, *me*, *my*, *we*, *our*.
4. **Specific.** Name the exact dish, the exact technology, the exact video format.

These rules are assessed under the Literacy and Terminology indicator of Investigation (I3).`,
    },

    // ── Slide 3 ── MCQ: Rule Check ──────────────────────────────────────────
    {
      id: 'slide-03-rule-check',
      type: 'mcq',
      section: 'orientation',
      variant: 'self',
      question: 'Which sentence follows the Action Plan rules?',
      options: [
        {
          id: 'a',
          text: 'We will use the Thermomix to make a delicious custard that we think everyone will love.',
          correct: false,
          explanation:
            'Uses "we" and is vague — no dish name, no video format.',
        },
        {
          id: 'b',
          text: 'The group will use the Thermomix to produce a vanilla custard French toast for a TikTok video.',
          correct: true,
          explanation:
            'Formal, present tense, specific dish, named technology, named video format.',
        },
        {
          id: 'c',
          text: "I am going to make French toast because it's easy.",
          correct: false,
          explanation:
            'Uses "I", is not specific about technology or video format.',
        },
        {
          id: 'd',
          text: 'The Thermomix was amazing when we used it last time.',
          correct: false,
          explanation:
            'Past tense and not relevant to a future plan.',
        },
      ],
    },

    // ── Slide 4 ── Content: Section 1 — The Aim ─────────────────────────────
    {
      id: 'slide-04-aim-intro',
      type: 'content',
      section: 'aim',
      title: 'Section 1: The Aim',
      body: `The Aim is one sharp sentence (20 to 50 words) that states what the task requires. A strong Aim names three things:

- The specific dish
- The assigned kitchen technology
- The video format

It also connects the task to the food and hospitality industry rather than just describing what the group is doing.`,
    },

    // ── Slide 5 ── Scaffold: Aim (Framed) ───────────────────────────────────
    {
      id: 'slide-05-aim-scaffold',
      type: 'scaffold',
      section: 'aim',
      mode: 'framed',
      config: {
        id: 'aim',
        targetQuestion: 'Write the Aim for your Action Plan.',
        mode: 'framed',
        sectionHeading: 'Aim',
        prompts: [
          {
            id: 'aim-dish',
            text: 'What specific dish will your group produce? Include every element: protein, sauce, garnish, and method.',
            frame: 'The aim of this task is to produce {answer}',
            maxLen: 200,
          },
          {
            id: 'aim-technology',
            text: 'Which piece of kitchen technology have you been assigned?',
            frame: 'using the {answer}',
            maxLen: 60,
          },
          {
            id: 'aim-benefit',
            text: 'What is the industry relevant benefit this technology provides? Choose one: efficiency, consistency, food safety, presentation quality, or time saving.',
            frame:
              'in order to demonstrate how commercial kitchen technology can improve {answer}',
            maxLen: 60,
          },
          {
            id: 'aim-format',
            text: 'Which video format has your group chosen? TikTok, Instagram reel, website video, or infomercial.',
            frame: 'in the food and hospitality industry, documented through a {answer}.',
            maxLen: 60,
          },
        ],
      },
    },

    // ── Slide 6 ── Content: Section 2 — The Issues and TEE ──────────────────
    {
      id: 'slide-06-issues-intro',
      type: 'content',
      section: 'issues',
      title: 'Section 2: The Issues and TEE structure',
      body: `The Issues section is three paragraphs of roughly 100 words each. Each paragraph follows the **TEE** structure:

- **T**opic: a clear opening sentence that names the issue
- **E**vidence: a cited source (Author, Year) that supports the issue
- **E**xplanation: analysis of why this issue matters to the industry and to this task

Strong issues are industry specific. Weak issues sound generic, like "food is important".`,
    },

    // ── Slide 7 ── MCQ: TEE Check ───────────────────────────────────────────
    {
      id: 'slide-07-tee-check',
      type: 'mcq',
      section: 'issues',
      variant: 'self',
      question: 'Which sentence is the Evidence in a TEE paragraph?',
      options: [
        {
          id: 'a',
          text: 'Food safety is a significant consideration in commercial kitchens.',
          correct: false,
          explanation:
            'This is the Topic sentence — it names the issue but cites no source.',
        },
        {
          id: 'b',
          text: 'According to Food Standards Australia (2024), 4.1 million Australians experience food poisoning each year.',
          correct: true,
          explanation:
            'Cited, specific, and data backed — that is the Evidence.',
        },
        {
          id: 'c',
          text: 'This matters for our dish because we are working with dairy and eggs.',
          correct: false,
          explanation:
            'This is the Explanation — it links the evidence back to the task.',
        },
        {
          id: 'd',
          text: 'Food safety should always be the priority.',
          correct: false,
          explanation: 'An opinion without evidence — not useful in a TEE paragraph.',
        },
      ],
    },

    // ── Slide 8 ── Scaffold: Issue 1 (Framed) ───────────────────────────────
    {
      id: 'slide-08-issue1-scaffold',
      type: 'scaffold',
      section: 'issues',
      mode: 'framed',
      config: {
        id: 'issue-1',
        targetQuestion: 'Write a paragraph (roughly 100 words) on your first Issue.',
        mode: 'framed',
        sectionHeading: 'Issues',
        prompts: [
          {
            id: 'issue1-topic',
            text: 'Which issue is this paragraph about? Pick one: food trends, kitchen technology, food safety, nutrition, sustainability, or consumer behaviour.',
            frame:
              '{answer} is a significant consideration in the food and hospitality industry',
            maxLen: 60,
          },
          {
            id: 'issue1-reason',
            text: 'Why does this issue matter to commercial kitchens or consumers? One clause.',
            frame: 'because {answer}.',
            maxLen: 200,
          },
          {
            id: 'issue1-citation',
            text: 'What specific piece of evidence supports this? Include author and year.',
            frame: 'According to {answer},',
            maxLen: 100,
          },
          {
            id: 'issue1-evidence',
            text: 'What does the evidence actually show? Data, trend, or finding in one sentence.',
            frame: '{answer}.',
            maxLen: 200,
          },
          {
            id: 'issue1-relevance',
            text: 'How is this relevant to your specific dish, technology, or video format?',
            frame: 'This is relevant to this task because {answer}.',
            maxLen: 200,
          },
        ],
      },
    },

    // ── Slide 9 ── Scaffold: Issue 2 (Framed) ───────────────────────────────
    {
      id: 'slide-09-issue2-scaffold',
      type: 'scaffold',
      section: 'issues',
      mode: 'framed',
      config: {
        id: 'issue-2',
        targetQuestion:
          'Write a paragraph (roughly 100 words) on your second Issue. Choose a different issue category to Issue 1.',
        mode: 'framed',
        sectionHeading: 'Issues',
        prompts: [
          {
            id: 'issue2-topic',
            text: 'Which issue is this paragraph about? Choose a different category to Issue 1.',
            frame:
              '{answer} is a significant consideration in the food and hospitality industry',
            maxLen: 60,
          },
          {
            id: 'issue2-reason',
            text: 'Why does this issue matter to commercial kitchens or consumers? One clause.',
            frame: 'because {answer}.',
            maxLen: 200,
          },
          {
            id: 'issue2-citation',
            text: 'What specific piece of evidence supports this? Include author and year.',
            frame: 'According to {answer},',
            maxLen: 100,
          },
          {
            id: 'issue2-evidence',
            text: 'What does the evidence actually show? Data, trend, or finding in one sentence.',
            frame: '{answer}.',
            maxLen: 200,
          },
          {
            id: 'issue2-relevance',
            text: 'How is this relevant to your specific dish, technology, or video format?',
            frame: 'This is relevant to this task because {answer}.',
            maxLen: 200,
          },
        ],
      },
    },

    // ── Slide 10 ── Scaffold: Issue 3 (Framed) ──────────────────────────────
    {
      id: 'slide-10-issue3-scaffold',
      type: 'scaffold',
      section: 'issues',
      mode: 'framed',
      config: {
        id: 'issue-3',
        targetQuestion:
          'Write a paragraph (roughly 100 words) on your third Issue. Choose a different issue category again.',
        mode: 'framed',
        sectionHeading: 'Issues',
        prompts: [
          {
            id: 'issue3-topic',
            text: 'Which issue is this paragraph about? Choose a different category again.',
            frame:
              '{answer} is a significant consideration in the food and hospitality industry',
            maxLen: 60,
          },
          {
            id: 'issue3-reason',
            text: 'Why does this issue matter to commercial kitchens or consumers? One clause.',
            frame: 'because {answer}.',
            maxLen: 200,
          },
          {
            id: 'issue3-citation',
            text: 'What specific piece of evidence supports this? Include author and year.',
            frame: 'According to {answer},',
            maxLen: 100,
          },
          {
            id: 'issue3-evidence',
            text: 'What does the evidence actually show? Data, trend, or finding in one sentence.',
            frame: '{answer}.',
            maxLen: 200,
          },
          {
            id: 'issue3-relevance',
            text: 'How is this relevant to your specific dish, technology, or video format?',
            frame: 'This is relevant to this task because {answer}.',
            maxLen: 200,
          },
        ],
      },
    },

    // ── Slide 11 ── Content: Sections 3 & 4 — Decision and Justification ────
    {
      id: 'slide-11-decision-intro',
      type: 'content',
      section: 'decision',
      title: 'Sections 3 & 4: Decision and Justification',
      body: `The **Decision** is one sentence. Name the dish specifically, name the technology, name the video format. Reasoning goes in the Justification, not here.

The **Justification** is roughly 100 words. Every sentence must link back to one of the three Issues above. If an issue does not reappear here, it has not been justified. Explain *how* the technology or dish choice solves the issue, not just *that* it does.

From this point the scaffold stops giving sentence frames. Write full sentences yourself. The prompts are your checklist.`,
    },

    // ── Slide 12 ── Scaffold: Decision (Guided) ─────────────────────────────
    {
      id: 'slide-12-decision-scaffold',
      type: 'scaffold',
      section: 'decision',
      mode: 'guided',
      config: {
        id: 'decision',
        targetQuestion: 'State your group\u2019s Decision in one sentence.',
        mode: 'guided',
        sectionHeading: 'Decision',
        prompts: [
          {
            id: 'decision-sentence',
            text: 'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.',
            maxWords: 60,
            hint: 'The group will produce [dish] using the [technology], showcased through a [format] targeting [audience].',
          },
        ],
      },
    },

    // ── Slide 13 ── Scaffold: Justification (Guided) ────────────────────────
    {
      id: 'slide-13-justification-scaffold',
      type: 'scaffold',
      section: 'justification',
      mode: 'guided',
      config: {
        id: 'justification',
        targetQuestion:
          'Write the Justification paragraph (roughly 100 words) linking your Decision to each of your three Issues.',
        mode: 'guided',
        sectionHeading: 'Justification',
        prompts: [
          {
            id: 'justification-issue1',
            text: 'Write one sentence explaining how the dish addresses Issue 1.',
            maxWords: 40,
            hint: 'This dish directly addresses [issue] because [reason].',
          },
          {
            id: 'justification-issue2',
            text: 'Write one sentence explaining how the assigned technology addresses Issue 2.',
            maxWords: 40,
            hint: 'The [technology] was selected because [reason], reflecting how [industry connection].',
          },
          {
            id: 'justification-issue3',
            text: 'Write one sentence explaining how the practical addresses Issue 3.',
            maxWords: 40,
            hint: '[Issue] is maintained by [specific action] to [outcome].',
          },
          {
            id: 'justification-format',
            text: 'Write one sentence explaining why the chosen video format suits the audience and industry context.',
            maxWords: 40,
            hint: 'A [format] was chosen because the target audience of [audience] engages primarily through [platform].',
          },
        ],
      },
    },

    // ── Slide 14 ── Content: Section 5 — Implementation Table ───────────────
    {
      id: 'slide-14-implementation-intro',
      type: 'content',
      section: 'implementation',
      title: 'Section 5: The Implementation Table',
      body: `The Implementation section is a When / What / Why table. Every row needs all three columns. Be specific. Cover the full arc: technology research, food order, time plan, mise en place, filming schedule, video editing.

Tables do not count in your word limit. Use this section to show planning depth.`,
    },

    // ── Slide 15 ── Scaffold: Implementation (Freeform) ─────────────────────
    {
      id: 'slide-15-implementation-scaffold',
      type: 'scaffold',
      section: 'implementation',
      mode: 'freeform-table',
      config: {
        id: 'implementation',
        targetQuestion: 'Build the Implementation table for your group.',
        mode: 'freeform-table',
        sectionHeading: 'Implementation',
        template: {
          columns: [
            { id: 'when', label: 'When' },
            { id: 'what', label: 'What', hint: 'Describe the specific task or activity.' },
            { id: 'why', label: 'Why', hint: 'Explain the purpose, not just the action.' },
          ],
          minRows: 6,
          rowLabels: ['Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11'],
        },
      },
    },

    // ── Slide 16 ── Content: References ─────────────────────────────────────
    {
      id: 'slide-16-references',
      type: 'content',
      section: 'references',
      title: 'Section 6: References',
      body: `Every source you cited in the Issues section must appear in the reference list at the bottom of your Action Plan. APA 7th edition format.

List each source on a new line. Include: Author, Year, *Title*, Publisher, URL.

Use the format: Author, A. A. (Year). *Title of work*. Publisher. https://url`,
    },

    // ── Slide 17 ── Review ───────────────────────────────────────────────────
    {
      id: 'slide-17-review',
      type: 'review',
      section: 'review',
    },
  ],
}

export default lesson
