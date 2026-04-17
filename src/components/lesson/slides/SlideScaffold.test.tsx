import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { SlideScaffold } from './SlideScaffold'
import { ActionPlanPanel } from '@/components/lesson/ActionPlanPanel'
import { countWords } from './scaffold/wordCounter'
import type { SlideConfig, SlideAnswers } from '@/lessons/types'

// ── matchMedia stub ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const framedSlide: Extract<SlideConfig, { type: 'scaffold' }> = {
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
        text: 'What specific dish will your group produce?',
        frame: 'The aim of this task is to produce {answer}',
        maxLen: 200,
      },
      {
        id: 'aim-technology',
        text: 'Which piece of kitchen technology have you been assigned?',
        frame: 'using the {answer}',
        maxLen: 60,
      },
    ],
  },
}

const allSlides = [framedSlide] as SlideConfig[]

function renderScaffoldWithPanel(
  initialAnswers?: Record<string, { kind: 'text'; values: Record<string, string> }>
) {
  const baseState = makeLessonState('test-lesson', allSlides)
  const state = initialAnswers ? { ...baseState, answers: initialAnswers } : baseState

  return render(
    <LessonProvider initialState={state}>
      <SlideScaffold slide={framedSlide} />
      <ActionPlanPanel scribeLabel="Alex Chen" />
    </LessonProvider>
  )
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('SlideScaffold — rendering', () => {
  it('renders the section badge', () => {
    renderScaffoldWithPanel()
    // "Aim" appears in both the section badge and the ActionPlanPanel heading;
    // check that the slide article contains the badge text.
    const article = screen.getByRole('article')
    expect(within(article).getByText('Aim')).toBeInTheDocument()
  })

  it('renders the slide heading', () => {
    renderScaffoldWithPanel()
    expect(
      screen.getByRole('heading', { name: 'Write the Aim for your Action Plan.' })
    ).toBeInTheDocument()
  })

  it('renders a label and input for each prompt', () => {
    renderScaffoldWithPanel()
    expect(screen.getByLabelText('What specific dish will your group produce?')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Which piece of kitchen technology have you been assigned?')
    ).toBeInTheDocument()
  })

  it('commit button is disabled when prompts are empty', () => {
    renderScaffoldWithPanel()
    expect(screen.getByRole('button', { name: 'Commit' })).toBeDisabled()
  })

  it('commit button is enabled when all prompts have values', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await user.type(
      screen.getByLabelText('What specific dish will your group produce?'),
      'vanilla custard French toast'
    )
    await user.type(
      screen.getByLabelText('Which piece of kitchen technology have you been assigned?'),
      'Thermomix'
    )

    expect(screen.getByRole('button', { name: 'Commit' })).not.toBeDisabled()
  })
})

// ── Commit flow ───────────────────────────────────────────────────────────────

describe('SlideScaffold — commit flow', () => {
  async function fillAndCommit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
      screen.getByLabelText('What specific dish will your group produce?'),
      'vanilla custard French toast'
    )
    await user.type(
      screen.getByLabelText('Which piece of kitchen technology have you been assigned?'),
      'Thermomix'
    )
    await user.click(screen.getByRole('button', { name: 'Commit' }))
  }

  it('Cmd+Enter commits when all prompts are filled', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await user.type(
      screen.getByLabelText('What specific dish will your group produce?'),
      'vanilla custard French toast'
    )
    await user.type(
      screen.getByLabelText('Which piece of kitchen technology have you been assigned?'),
      'Thermomix'
    )

    // Focus inside the slide so the keydown is captured
    screen.getByLabelText('Which piece of kitchen technology have you been assigned?').focus()
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    // Commit button should be replaced by Edit
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Commit' })).not.toBeInTheDocument()
  })

  it('clicking Commit replaces the Commit button with Edit', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillAndCommit(user)

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Commit' })).not.toBeInTheDocument()
  })

  it('after commit, inputs are read-only', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillAndCommit(user)

    const input1 = screen.getByLabelText('What specific dish will your group produce?')
    const input2 = screen.getByLabelText(
      'Which piece of kitchen technology have you been assigned?'
    )

    expect(input1).toHaveAttribute('readonly')
    expect(input2).toHaveAttribute('readonly')
  })

  it('the Action Plan panel shows the assembled paragraph under the Aim section', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillAndCommit(user)

    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).getByText(/vanilla custard French toast/)).toBeInTheDocument()
    expect(within(panel).getByText(/Thermomix/)).toBeInTheDocument()
  })

  it('the Aim section in the panel no longer shows "Not yet written" after commit', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    // Before commit: 2 "Not yet written" placeholders (one per section; our fixture has aim)
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    const beforeCount = within(panel).getAllByText('Not yet written').length
    expect(beforeCount).toBeGreaterThan(0)

    await fillAndCommit(user)

    // After commit: one fewer "Not yet written"
    const afterCount = within(panel).getAllByText('Not yet written').length
    expect(afterCount).toBe(beforeCount - 1)
  })
})

// ── Edit / uncommit flow ──────────────────────────────────────────────────────

describe('SlideScaffold — edit flow', () => {
  async function fillCommitThenEdit(user: ReturnType<typeof userEvent.setup>) {
    await user.type(
      screen.getByLabelText('What specific dish will your group produce?'),
      'vanilla custard French toast'
    )
    await user.type(
      screen.getByLabelText('Which piece of kitchen technology have you been assigned?'),
      'Thermomix'
    )
    await user.click(screen.getByRole('button', { name: 'Commit' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
  }

  it('clicking Edit replaces the Edit button with Commit', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillCommitThenEdit(user)

    expect(screen.getByRole('button', { name: 'Commit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('after Edit, inputs become editable again', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillCommitThenEdit(user)

    const input1 = screen.getByLabelText('What specific dish will your group produce?')
    expect(input1).not.toHaveAttribute('readonly')
  })

  it('the Aim section in the panel reverts to "Not yet written" after Edit', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillCommitThenEdit(user)

    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    // All sections (including Aim after revert) show "Not yet written"
    expect(within(panel).getAllByText('Not yet written').length).toBeGreaterThan(0)
  })

  it('the panel no longer shows the committed paragraph after Edit', async () => {
    const user = userEvent.setup()
    renderScaffoldWithPanel()

    await fillCommitThenEdit(user)

    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).queryByText(/vanilla custard French toast/)).not.toBeInTheDocument()
  })
})

// ── Word counter unit tests ───────────────────────────────────────────────────

describe('countWords', () => {
  it('returns zero for an empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('returns zero for a whitespace-only string', () => {
    expect(countWords('   ')).toBe(0)
  })

  it('counts words in a normal sentence (under limit)', () => {
    expect(countWords('vanilla custard French toast')).toBe(4)
  })

  it('counts correctly at the limit', () => {
    const atLimit = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ')
    expect(countWords(atLimit)).toBe(20)
  })

  it('counts correctly over the limit', () => {
    const overLimit = Array.from({ length: 25 }, (_, i) => `word${i}`).join(' ')
    expect(countWords(overLimit)).toBe(25)
  })

  it('handles multiple spaces between words', () => {
    expect(countWords('hello   world')).toBe(2)
  })

  it('handles leading and trailing whitespace', () => {
    expect(countWords('  hello world  ')).toBe(2)
  })
})

// ── Guided mode ───────────────────────────────────────────────────────────────

const guidedSlide: Extract<SlideConfig, { type: 'scaffold' }> = {
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
}

function renderGuided(initialAnswers?: Record<string, SlideAnswers>) {
  const allSlidesGuided = [guidedSlide] as SlideConfig[]
  const baseState = makeLessonState('test-lesson', allSlidesGuided)
  const state = initialAnswers ? { ...baseState, answers: initialAnswers } : baseState
  return render(
    <LessonProvider initialState={state}>
      <SlideScaffold slide={guidedSlide} />
      <ActionPlanPanel scribeLabel="Alex Chen" />
    </LessonProvider>
  )
}

describe('SlideScaffold — guided mode', () => {
  it('renders the slide heading', () => {
    renderGuided()
    expect(
      screen.getByRole('heading', { name: 'State your group\u2019s Decision in one sentence.' })
    ).toBeInTheDocument()
  })

  it('renders the prompt label and input', () => {
    renderGuided()
    expect(
      screen.getByLabelText(
        'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.'
      )
    ).toBeInTheDocument()
  })

  it('renders the hint text', () => {
    renderGuided()
    expect(screen.getByText(/The group will produce \[dish\]/)).toBeInTheDocument()
  })

  it('Commit button is disabled when the prompt is empty', () => {
    renderGuided()
    expect(screen.getByRole('button', { name: 'Commit' })).toBeDisabled()
  })

  it('Commit button is enabled after filling the prompt', async () => {
    const user = userEvent.setup()
    renderGuided()
    await user.type(
      screen.getByLabelText(
        'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.'
      ),
      'The group will produce custard French toast using the Thermomix, showcased through a tutorial targeting home cooks.'
    )
    expect(screen.getByRole('button', { name: 'Commit' })).not.toBeDisabled()
  })

  it('Cmd+Enter commits when prompt is filled', async () => {
    const user = userEvent.setup()
    renderGuided()
    const input = screen.getByLabelText(
      'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.'
    )
    await user.type(input, 'The group will produce custard French toast using the Thermomix.')
    input.focus()
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Commit' })).not.toBeInTheDocument()
  })

  it('the Action Plan panel shows Decision text after commit', async () => {
    const user = userEvent.setup()
    renderGuided()
    const input = screen.getByLabelText(
      'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.'
    )
    await user.type(input, 'The group will produce custard French toast using the Thermomix.')
    await user.click(screen.getByRole('button', { name: 'Commit' }))
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).getByText(/custard French toast/)).toBeInTheDocument()
  })

  it('Edit round-trip reverts panel to "Not yet written"', async () => {
    const user = userEvent.setup()
    renderGuided()
    const input = screen.getByLabelText(
      'Write one sentence that names the dish (with all elements), the assigned technology, the video format, and the target audience.'
    )
    await user.type(input, 'The group will produce custard French toast using the Thermomix.')
    await user.click(screen.getByRole('button', { name: 'Commit' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).queryByText(/custard French toast/)).not.toBeInTheDocument()
    expect(within(panel).getAllByText('Not yet written').length).toBeGreaterThan(0)
  })
})

// ── Freeform-table mode ───────────────────────────────────────────────────────

const freeformSlide: Extract<SlideConfig, { type: 'scaffold' }> = {
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
}

const FULL_TABLE_ROWS: Array<Record<string, string>> = [
  { what: 'Research the Thermomix', why: 'Understand the technology before cooking.' },
  { what: 'Order ingredients', why: 'Ensure all ingredients are ready on time.' },
  { what: 'Mise en place', why: 'Set up an efficient cooking environment.' },
  { what: 'Film the cooking session', why: 'Document the process for the video.' },
  { what: 'Edit the video footage', why: 'Create the final polished product.' },
  { what: 'Review and submit', why: 'Ensure quality before final submission.' },
]

function renderFreeform(
  initialAnswers?: Record<string, SlideAnswers>,
  committedSlideIds?: string[]
) {
  const allSlidesFreeform = [freeformSlide] as SlideConfig[]
  const baseState = makeLessonState('test-lesson', allSlidesFreeform)
  const state = {
    ...baseState,
    ...(initialAnswers ? { answers: initialAnswers } : {}),
    ...(committedSlideIds ? { committedSlideIds } : {}),
  }
  return render(
    <LessonProvider initialState={state}>
      <SlideScaffold slide={freeformSlide} />
      <ActionPlanPanel scribeLabel="Alex Chen" />
    </LessonProvider>
  )
}

describe('SlideScaffold — freeform-table mode', () => {
  it('renders the column headers', () => {
    renderFreeform()
    expect(screen.getByRole('columnheader', { name: 'When' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'What' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Why' })).toBeInTheDocument()
  })

  it('renders the Add row button', () => {
    renderFreeform()
    expect(screen.getByRole('button', { name: 'Add row' })).toBeInTheDocument()
  })

  it('the first column cells for labelled rows are read-only', () => {
    renderFreeform()
    // "Week 6: When" is the sr-only label for the first cell of row 0
    const cell = screen.getByLabelText('Week 6: When')
    expect(cell).toHaveAttribute('readonly')
  })

  it('Commit is disabled when no rows are filled', () => {
    renderFreeform()
    expect(screen.getByRole('button', { name: 'Commit' })).toBeDisabled()
  })

  it('Commit is enabled when all six rows are pre-seeded with content', () => {
    renderFreeform({
      [freeformSlide.id]: { kind: 'table', rows: FULL_TABLE_ROWS },
    })
    expect(screen.getByRole('button', { name: 'Commit' })).not.toBeDisabled()
  })

  it('the Action Plan panel shows Implementation table text after commit', async () => {
    const user = userEvent.setup()
    renderFreeform({ [freeformSlide.id]: { kind: 'table', rows: FULL_TABLE_ROWS } })
    await user.click(screen.getByRole('button', { name: 'Commit' }))
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).getByText(/Week 6/)).toBeInTheDocument()
    expect(within(panel).getByText(/Research the Thermomix/)).toBeInTheDocument()
  })

  it('Edit round-trip reverts panel to "Not yet written"', async () => {
    const user = userEvent.setup()
    renderFreeform({ [freeformSlide.id]: { kind: 'table', rows: FULL_TABLE_ROWS } })
    await user.click(screen.getByRole('button', { name: 'Commit' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).queryByText(/Research the Thermomix/)).not.toBeInTheDocument()
    expect(within(panel).getAllByText('Not yet written').length).toBeGreaterThan(0)
  })

  it('Add row adds a new editable row', async () => {
    const user = userEvent.setup()
    renderFreeform()
    // Initially 6 rows (minRows): find the "Row 7" label after adding
    await user.click(screen.getByRole('button', { name: 'Add row' }))
    // Row 7 has no rowLabel so the sr-only label format is "Row 7: When"
    expect(screen.getByLabelText('Row 7: When')).toBeInTheDocument()
    expect(screen.getByLabelText('Row 7: What')).toBeInTheDocument()
    expect(screen.getByLabelText('Row 7: Why')).toBeInTheDocument()
  })

  it('Add row button is hidden after commit', async () => {
    const user = userEvent.setup()
    renderFreeform({ [freeformSlide.id]: { kind: 'table', rows: FULL_TABLE_ROWS } })
    await user.click(screen.getByRole('button', { name: 'Commit' }))
    expect(screen.queryByRole('button', { name: 'Add row' })).not.toBeInTheDocument()
  })
})

// ── ReferenceBuilder integration ─────────────────────────────────────────────

const referencesSlide: Extract<SlideConfig, { type: 'scaffold' }> = {
  id: 'slide-17-references-scaffold',
  type: 'scaffold',
  section: 'references',
  mode: 'freeform-table',
  config: {
    id: 'references',
    targetQuestion: 'List your references in APA 7th edition format.',
    mode: 'freeform-table',
    sectionHeading: 'References',
    template: {
      columns: [{ id: 'reference', label: 'Reference', hint: 'Use APA 7th edition format.' }],
      minRows: 1,
    },
  },
}

function renderReferences(committedSlideIds?: string[]) {
  const allSlidesRefs = [referencesSlide] as SlideConfig[]
  const baseState = makeLessonState('test-lesson', allSlidesRefs)
  const state = {
    ...baseState,
    ...(committedSlideIds ? { committedSlideIds } : {}),
  }
  return render(
    <LessonProvider initialState={state}>
      <SlideScaffold slide={referencesSlide} />
      <ActionPlanPanel scribeLabel="Alex Chen" />
    </LessonProvider>
  )
}

describe('SlideScaffold — ReferenceBuilder integration', () => {
  it('renders the ReferenceBuilder above the table for references slides', () => {
    renderReferences()
    expect(screen.getByTestId('reference-builder')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toBeInTheDocument()
  })

  it('Add Reference inserts a citation as a table row', async () => {
    const user = userEvent.setup()
    renderReferences()

    await user.type(screen.getByLabelText('Author(s)'), 'Smith, J.')
    await user.type(screen.getByLabelText('Year'), '2023')
    await user.type(screen.getByLabelText('Title'), 'How to cook custard')
    await user.click(screen.getByTestId('add-reference-btn'))

    // The citation should appear as the value in the first table row textarea
    const textarea = screen.getByLabelText('Row 1: Reference')
    expect((textarea as HTMLTextAreaElement).value).toContain('Smith, J.')
    expect((textarea as HTMLTextAreaElement).value).toContain('2023')
  })

  it('manual entry in the table row also works', async () => {
    const user = userEvent.setup()
    renderReferences()

    const textarea = screen.getByLabelText('Row 1: Reference')
    await user.type(textarea, 'Jones, A. (2021). Food Science. Publisher.')

    expect((textarea as HTMLTextAreaElement).value).toContain('Jones, A.')
  })

  it('does not render ReferenceBuilder after commit', () => {
    renderReferences([referencesSlide.id])
    expect(screen.queryByTestId('reference-builder')).not.toBeInTheDocument()
  })
})

// ── Engine adapter tests ──────────────────────────────────────────────────────

describe('engineAdapter — buildEngineAnswers', () => {
  // Import lazily to test in isolation
  it('builds text answers for a framed slide', async () => {
    const { buildEngineAnswers } = await import('@/lessons/engineAdapter')
    const answers = buildEngineAnswers(framedSlide, {
      kind: 'text',
      values: { 'aim-dish': 'French toast', 'aim-technology': 'Thermomix' },
    })
    expect(answers).toHaveLength(2)
    expect(answers[0]).toMatchObject({ kind: 'text', promptId: 'aim-dish', value: 'French toast' })
    expect(answers[1]).toMatchObject({
      kind: 'text',
      promptId: 'aim-technology',
      value: 'Thermomix',
    })
  })

  it('returns empty string for a missing answer', async () => {
    const { buildEngineAnswers } = await import('@/lessons/engineAdapter')
    const answers = buildEngineAnswers(framedSlide, undefined)
    expect(answers[0]).toMatchObject({ kind: 'text', promptId: 'aim-dish', value: '' })
  })

  it('assembleSlide returns a paragraph and warnings array', async () => {
    const { assembleSlide } = await import('@/lessons/engineAdapter')
    const result = assembleSlide(framedSlide, {
      kind: 'text',
      values: { 'aim-dish': 'French toast', 'aim-technology': 'Thermomix' },
    })
    expect(result).toHaveProperty('paragraph')
    expect(result).toHaveProperty('warnings')
    expect(typeof result.paragraph).toBe('string')
    expect(Array.isArray(result.warnings)).toBe(true)
    expect(result.paragraph).toContain('French toast')
  })
})
