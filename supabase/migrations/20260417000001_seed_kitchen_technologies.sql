-- ============================================================
-- Seed: Kitchen Technologies lesson (18 slides)
--
-- Uses jsonb_build_object() / jsonb_build_array() throughout so
-- there are NO literal JSON strings — newlines are built with
-- chr(10), apostrophes with '' (doubled) or the actual UTF-8
-- curly-quote character.  Safe to paste into the Supabase SQL
-- editor without any JSON escaping errors.
--
-- Idempotent: re-running this script is safe.
--   • lesson  — ON CONFLICT (slug) DO NOTHING
--   • slides  — only inserted if no slides exist for the lesson
-- ============================================================

DO $$
DECLARE
  v_teacher_id uuid;
  v_lesson_id  uuid;
BEGIN

  -- ── Find the teacher account ─────────────────────────────────
  SELECT id INTO v_teacher_id
  FROM auth.users
  WHERE email = 'b85harvey@gmail.com';

  -- ── Insert the lesson row (idempotent) ───────────────────────
  INSERT INTO public.lessons (slug, unit_id, title, created_by)
  VALUES (
    'kitchen-technologies',
    'unit-2',
    'Unit 2 Kitchen Technologies: Writing the Group Action Plan',
    v_teacher_id
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_lesson_id
  FROM public.lessons
  WHERE slug = 'kitchen-technologies';

  -- ── Insert slides only if none exist yet ─────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.slides WHERE lesson_id = v_lesson_id) THEN

    INSERT INTO public.slides (lesson_id, sort_order, type, config) VALUES

    -- ── Slide 1: Content — Orientation ───────────────────────
    (v_lesson_id, 1, 'content', jsonb_build_object(
      'id',      'slide-01-orientation',
      'type',    'content',
      'section', 'orientation',
      'title',   'Welcome to the Action Plan lesson',
      'body',
        'This lesson walks your group through writing the Action Plan for Unit 2 Kitchen Technologies. By the end you will have a complete 400 word Action Plan ready to copy across into your submission document.'
        || chr(10) || chr(10) ||
        'You already know the task: produce a dish using an assigned kitchen technology and document it in a video. Your group has already been told which piece of technology you have been given. Keep it in mind as you work through the prompts.'
    )),

    -- ── Slide 2: Content — Four Rules ────────────────────────
    (v_lesson_id, 2, 'content', jsonb_build_object(
      'id',      'slide-02-rules',
      'type',    'content',
      'section', 'orientation',
      'title',   'Four rules for your Action Plan',
      'body',
        'Four rules apply to everything you write in this Action Plan:'
        || chr(10) || chr(10) ||
        '1. **400 words maximum.** Tables do not count.'
        || chr(10) ||
        '2. **Present tense.** The practical has not happened yet.'
        || chr(10) ||
        '3. **Formal and objective.** No *I*, *me*, *my*, *we*, *our*.'
        || chr(10) ||
        '4. **Specific.** Name the exact dish, the exact technology, the exact video format.'
        || chr(10) || chr(10) ||
        'These rules are assessed under the Literacy and Terminology indicator of Investigation (I3).'
    )),

    -- ── Slide 3: MCQ — Rule Check ─────────────────────────────
    (v_lesson_id, 3, 'mcq', jsonb_build_object(
      'id',       'slide-03-rule-check',
      'type',     'mcq',
      'section',  'orientation',
      'variant',  'self',
      'question', 'Which sentence follows the Action Plan rules?',
      'options',  jsonb_build_array(
        jsonb_build_object(
          'id', 'a', 'correct', false,
          'text', 'We will use the Thermomix to make a delicious custard that we think everyone will love.',
          'explanation', 'Uses "we" and is vague — no dish name, no video format.'
        ),
        jsonb_build_object(
          'id', 'b', 'correct', true,
          'text', 'The group will use the Thermomix to produce a vanilla custard French toast for a TikTok video.',
          'explanation', 'Formal, present tense, specific dish, named technology, named video format.'
        ),
        jsonb_build_object(
          'id', 'c', 'correct', false,
          'text', 'I am going to make French toast because it''s easy.',
          'explanation', 'Uses "I", is not specific about technology or video format.'
        ),
        jsonb_build_object(
          'id', 'd', 'correct', false,
          'text', 'The Thermomix was amazing when we used it last time.',
          'explanation', 'Past tense and not relevant to a future plan.'
        )
      )
    )),

    -- ── Slide 4: Content — Section 1 Aim Intro ───────────────
    (v_lesson_id, 4, 'content', jsonb_build_object(
      'id',      'slide-04-aim-intro',
      'type',    'content',
      'section', 'aim',
      'title',   'Section 1: The Aim',
      'body',
        'The Aim is one sharp sentence (20 to 50 words) that states what the task requires. A strong Aim names three things:'
        || chr(10) || chr(10) ||
        '- The specific dish'
        || chr(10) ||
        '- The assigned kitchen technology'
        || chr(10) ||
        '- The video format'
        || chr(10) || chr(10) ||
        'It also connects the task to the food and hospitality industry rather than just describing what the group is doing.'
    )),

    -- ── Slide 5: Scaffold — Aim (Framed) ─────────────────────
    (v_lesson_id, 5, 'scaffold', jsonb_build_object(
      'id',      'slide-05-aim-scaffold',
      'type',    'scaffold',
      'section', 'aim',
      'mode',    'framed',
      'config',  jsonb_build_object(
        'id',             'aim',
        'targetQuestion', 'Write the Aim for your Action Plan.',
        'mode',           'framed',
        'sectionHeading', 'Aim',
        'prompts', jsonb_build_array(
          jsonb_build_object(
            'id', 'aim-dish',
            'text', 'What specific dish will your group produce? Include every element: protein, sauce, garnish, and method.',
            'frame', 'The aim of this task is to produce {answer}',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'aim-technology',
            'text', 'Which piece of kitchen technology have you been assigned?',
            'frame', 'using the {answer}',
            'maxLen', 60
          ),
          jsonb_build_object(
            'id', 'aim-benefit',
            'text', 'What is the industry relevant benefit this technology provides? Choose one: efficiency, consistency, food safety, presentation quality, or time saving.',
            'frame', 'in order to demonstrate how commercial kitchen technology can improve {answer}',
            'maxLen', 60
          ),
          jsonb_build_object(
            'id', 'aim-format',
            'text', 'Which video format has your group chosen? TikTok, Instagram reel, website video, or infomercial.',
            'frame', 'in the food and hospitality industry, documented through a {answer}.',
            'maxLen', 60
          )
        )
      )
    )),

    -- ── Slide 6: Content — Issues + TEE Intro ────────────────
    (v_lesson_id, 6, 'content', jsonb_build_object(
      'id',      'slide-06-issues-intro',
      'type',    'content',
      'section', 'issues',
      'title',   'Section 2: The Issues and TEE structure',
      'body',
        'The Issues section is three paragraphs of roughly 100 words each. Each paragraph follows the **TEE** structure:'
        || chr(10) || chr(10) ||
        '- **T**opic: a clear opening sentence that names the issue'
        || chr(10) ||
        '- **E**vidence: a cited source (Author, Year) that supports the issue'
        || chr(10) ||
        '- **E**xplanation: analysis of why this issue matters to the industry and to this task'
        || chr(10) || chr(10) ||
        'Strong issues are industry specific. Weak issues sound generic, like "food is important".'
    )),

    -- ── Slide 7: MCQ — TEE Check ──────────────────────────────
    (v_lesson_id, 7, 'mcq', jsonb_build_object(
      'id',       'slide-07-tee-check',
      'type',     'mcq',
      'section',  'issues',
      'variant',  'self',
      'question', 'Which sentence is the Evidence in a TEE paragraph?',
      'options',  jsonb_build_array(
        jsonb_build_object(
          'id', 'a', 'correct', false,
          'text', 'Food safety is a significant consideration in commercial kitchens.',
          'explanation', 'This is the Topic sentence — it names the issue but cites no source.'
        ),
        jsonb_build_object(
          'id', 'b', 'correct', true,
          'text', 'According to Food Standards Australia (2024), 4.1 million Australians experience food poisoning each year.',
          'explanation', 'Cited, specific, and data backed — that is the Evidence.'
        ),
        jsonb_build_object(
          'id', 'c', 'correct', false,
          'text', 'This matters for our dish because we are working with dairy and eggs.',
          'explanation', 'This is the Explanation — it links the evidence back to the task.'
        ),
        jsonb_build_object(
          'id', 'd', 'correct', false,
          'text', 'Food safety should always be the priority.',
          'explanation', 'An opinion without evidence — not useful in a TEE paragraph.'
        )
      )
    )),

    -- ── Slide 8: Scaffold — Issue 1 (Framed) ─────────────────
    (v_lesson_id, 8, 'scaffold', jsonb_build_object(
      'id',      'slide-08-issue1-scaffold',
      'type',    'scaffold',
      'section', 'issues',
      'mode',    'framed',
      'config',  jsonb_build_object(
        'id',             'issue-1',
        'targetQuestion', 'Write a paragraph (roughly 100 words) on your first Issue.',
        'mode',           'framed',
        'sectionHeading', 'Issues',
        'prompts', jsonb_build_array(
          jsonb_build_object(
            'id', 'issue1-topic',
            'text', 'Which issue is this paragraph about? Pick one: food trends, kitchen technology, food safety, nutrition, sustainability, or consumer behaviour.',
            'frame', '{answer} is a significant consideration in the food and hospitality industry',
            'maxLen', 60
          ),
          jsonb_build_object(
            'id', 'issue1-reason',
            'text', 'Why does this issue matter to commercial kitchens or consumers? One clause.',
            'frame', 'because {answer}.',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'issue1-citation',
            'text', 'What specific piece of evidence supports this? Include author and year.',
            'frame', 'According to {answer},',
            'maxLen', 100
          ),
          jsonb_build_object(
            'id', 'issue1-evidence',
            'text', 'What does the evidence actually show? Data, trend, or finding in one sentence.',
            'frame', '{answer}.',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'issue1-relevance',
            'text', 'How is this relevant to your specific dish, technology, or video format?',
            'frame', 'This is relevant to this task because {answer}.',
            'maxLen', 200
          )
        )
      )
    )),

    -- ── Slide 9: Scaffold — Issue 2 (Framed) ─────────────────
    (v_lesson_id, 9, 'scaffold', jsonb_build_object(
      'id',      'slide-09-issue2-scaffold',
      'type',    'scaffold',
      'section', 'issues',
      'mode',    'framed',
      'config',  jsonb_build_object(
        'id',             'issue-2',
        'targetQuestion', 'Write a paragraph (roughly 100 words) on your second Issue. Choose a different issue category to Issue 1.',
        'mode',           'framed',
        'sectionHeading', 'Issues',
        'prompts', jsonb_build_array(
          jsonb_build_object(
            'id', 'issue2-topic',
            'text', 'Which issue is this paragraph about? Choose a different category to Issue 1.',
            'frame', '{answer} is a significant consideration in the food and hospitality industry',
            'maxLen', 60
          ),
          jsonb_build_object(
            'id', 'issue2-reason',
            'text', 'Why does this issue matter to commercial kitchens or consumers? One clause.',
            'frame', 'because {answer}.',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'issue2-citation',
            'text', 'What specific piece of evidence supports this? Include author and year.',
            'frame', 'According to {answer},',
            'maxLen', 100
          ),
          jsonb_build_object(
            'id', 'issue2-evidence',
            'text', 'What does the evidence actually show? Data, trend, or finding in one sentence.',
            'frame', '{answer}.',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'issue2-relevance',
            'text', 'How is this relevant to your specific dish, technology, or video format?',
            'frame', 'This is relevant to this task because {answer}.',
            'maxLen', 200
          )
        )
      )
    )),

    -- ── Slide 10: Scaffold — Issue 3 (Framed) ────────────────
    (v_lesson_id, 10, 'scaffold', jsonb_build_object(
      'id',      'slide-10-issue3-scaffold',
      'type',    'scaffold',
      'section', 'issues',
      'mode',    'framed',
      'config',  jsonb_build_object(
        'id',             'issue-3',
        'targetQuestion', 'Write a paragraph (roughly 100 words) on your third Issue. Choose a different issue category again.',
        'mode',           'framed',
        'sectionHeading', 'Issues',
        'prompts', jsonb_build_array(
          jsonb_build_object(
            'id', 'issue3-topic',
            'text', 'Which issue is this paragraph about? Choose a different category again.',
            'frame', '{answer} is a significant consideration in the food and hospitality industry',
            'maxLen', 60
          ),
          jsonb_build_object(
            'id', 'issue3-reason',
            'text', 'Why does this issue matter to commercial kitchens or consumers? One clause.',
            'frame', 'because {answer}.',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'issue3-citation',
            'text', 'What specific piece of evidence supports this? Include author and year.',
            'frame', 'According to {answer},',
            'maxLen', 100
          ),
          jsonb_build_object(
            'id', 'issue3-evidence',
            'text', 'What does the evidence actually show? Data, trend, or finding in one sentence.',
            'frame', '{answer}.',
            'maxLen', 200
          ),
          jsonb_build_object(
            'id', 'issue3-relevance',
            'text', 'How is this relevant to your specific dish, technology, or video format?',
            'frame', 'This is relevant to this task because {answer}.',
            'maxLen', 200
          )
        )
      )
    )),

    -- ── Slide 11: Content — Decision + Justification Intro ───
    (v_lesson_id, 11, 'content', jsonb_build_object(
      'id',      'slide-11-decision-intro',
      'type',    'content',
      'section', 'decision',
      'title',   'Sections 3 & 4: Decision and Justification',
      'body',
        'The **Decision** is one sentence. Name the dish specifically, name the technology, name the video format. Reasoning goes in the Justification, not here.'
        || chr(10) || chr(10) ||
        'The **Justification** is roughly 100 words. Every sentence must link back to one of the three Issues above. If an issue does not reappear here, it has not been justified. Explain *how* the technology or dish choice solves the issue, not just *that* it does.'
        || chr(10) || chr(10) ||
        'From this point the scaffold stops giving sentence frames. Write full sentences yourself. The prompts are your checklist.'
    )),

    -- ── Slide 12: Scaffold — Decision (Guided) ───────────────
    -- Note: targetQuestion uses the Unicode right-single-quote (') — not an apostrophe.
    (v_lesson_id, 12, 'scaffold', jsonb_build_object(
      'id',      'slide-12-decision-scaffold',
      'type',    'scaffold',
      'section', 'decision',
      'mode',    'guided',
      'config',  jsonb_build_object(
        'id',             'decision',
        'targetQuestion', 'State your group' || chr(8217) || 's Decision in one sentence.',
        'mode',           'guided',
        'sectionHeading', 'Decision',
        'prompts', jsonb_build_array(
          jsonb_build_object(
            'id', 'decision-sentence',
            'text', 'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.',
            'maxWords', 60,
            'hint', 'The group will produce [dish] using the [technology], showcased through a [format] targeting [audience].'
          )
        )
      )
    )),

    -- ── Slide 13: Scaffold — Justification (Guided) ──────────
    (v_lesson_id, 13, 'scaffold', jsonb_build_object(
      'id',      'slide-13-justification-scaffold',
      'type',    'scaffold',
      'section', 'justification',
      'mode',    'guided',
      'config',  jsonb_build_object(
        'id',             'justification',
        'targetQuestion', 'Write the Justification paragraph (roughly 100 words) linking your Decision to each of your three Issues.',
        'mode',           'guided',
        'sectionHeading', 'Justification',
        'prompts', jsonb_build_array(
          jsonb_build_object(
            'id', 'justification-issue1',
            'text', 'Write one sentence explaining how the dish addresses Issue 1.',
            'maxWords', 40,
            'hint', 'This dish directly addresses [issue] because [reason].'
          ),
          jsonb_build_object(
            'id', 'justification-issue2',
            'text', 'Write one sentence explaining how the assigned technology addresses Issue 2.',
            'maxWords', 40,
            'hint', 'The [technology] was selected because [reason], reflecting how [industry connection].'
          ),
          jsonb_build_object(
            'id', 'justification-issue3',
            'text', 'Write one sentence explaining how the practical addresses Issue 3.',
            'maxWords', 40,
            'hint', '[Issue] is maintained by [specific action] to [outcome].'
          ),
          jsonb_build_object(
            'id', 'justification-format',
            'text', 'Write one sentence explaining why the chosen video format suits the audience and industry context.',
            'maxWords', 40,
            'hint', 'A [format] was chosen because the target audience of [audience] engages primarily through [platform].'
          )
        )
      )
    )),

    -- ── Slide 14: Content — Implementation Table Intro ───────
    (v_lesson_id, 14, 'content', jsonb_build_object(
      'id',      'slide-14-implementation-intro',
      'type',    'content',
      'section', 'implementation',
      'title',   'Section 5: The Implementation Table',
      'body',
        'The Implementation section is a When / What / Why table. Every row needs all three columns. Be specific. Cover the full arc: technology research, food order, time plan, mise en place, filming schedule, video editing.'
        || chr(10) || chr(10) ||
        'Tables do not count in your word limit. Use this section to show planning depth.'
    )),

    -- ── Slide 15: Scaffold — Implementation (Freeform Table) ─
    (v_lesson_id, 15, 'scaffold', jsonb_build_object(
      'id',      'slide-15-implementation-scaffold',
      'type',    'scaffold',
      'section', 'implementation',
      'mode',    'freeform-table',
      'config',  jsonb_build_object(
        'id',             'implementation',
        'targetQuestion', 'Build the Implementation table for your group.',
        'mode',           'freeform-table',
        'sectionHeading', 'Implementation',
        'template', jsonb_build_object(
          'columns', jsonb_build_array(
            jsonb_build_object('id', 'when', 'label', 'When'),
            jsonb_build_object('id', 'what', 'label', 'What', 'hint', 'Describe the specific task or activity.'),
            jsonb_build_object('id', 'why',  'label', 'Why',  'hint', 'Explain the purpose, not just the action.')
          ),
          'minRows',   6,
          'rowLabels', jsonb_build_array(
            'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11'
          )
        )
      )
    )),

    -- ── Slide 16: Content — References Intro ─────────────────
    (v_lesson_id, 16, 'content', jsonb_build_object(
      'id',      'slide-16-references',
      'type',    'content',
      'section', 'references',
      'title',   'Section 6: References',
      'body',
        'Every source you cited in the Issues section must appear in the reference list at the bottom of your Action Plan. APA 7th edition format.'
        || chr(10) || chr(10) ||
        'List each source on a new line. Include: Author, Year, *Title*, Publisher, URL.'
        || chr(10) || chr(10) ||
        'Use the format: Author, A. A. (Year). *Title of work*. Publisher. https://url'
    )),

    -- ── Slide 17: Scaffold — References (Freeform Table) ─────
    (v_lesson_id, 17, 'scaffold', jsonb_build_object(
      'id',      'slide-17-references-scaffold',
      'type',    'scaffold',
      'section', 'references',
      'mode',    'freeform-table',
      'config',  jsonb_build_object(
        'id',             'references',
        'targetQuestion', 'List your references in APA 7th edition format.',
        'mode',           'freeform-table',
        'sectionHeading', 'References',
        'template', jsonb_build_object(
          'columns', jsonb_build_array(
            jsonb_build_object('id', 'reference', 'label', 'Reference', 'hint', 'Use APA 7th edition format.')
          ),
          'minRows', 1
        )
      )
    )),

    -- ── Slide 18: Review ──────────────────────────────────────
    (v_lesson_id, 18, 'review', jsonb_build_object(
      'id',      'slide-18-review',
      'type',    'review',
      'section', 'review'
    ));

  END IF; -- end: slides not yet seeded

END;
$$;
