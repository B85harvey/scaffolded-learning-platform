/**
 * End-to-end keyboard walkthrough — full 18-slide Kitchen Technologies lesson.
 *
 * Uses userEvent.keyboard only (no mouse). Walks from cold load through every
 * slide to the Review slide and asserts key states at each step.
 *
 * Navigation model:
 *   - Content slides   → ArrowRight to advance (global shortcut, focus on container div)
 *   - Self-check MCQ   → digit key selects option, Cmd+Enter submits, ArrowRight advances
 *   - Scaffold slides  → textareas pre-filled, Cmd+Enter commits, then Tab×9 + Enter to advance
 *   - Review slide     → assert 6 sections rendered, word count within 5% of 378
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { LessonShell } from '@/components/lesson/LessonShell'
import kitchenTechnologies from '@/lessons/kitchen-technologies'

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  // No dev toolbar
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '' },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Tab N times then press the activating key.
 * Used to navigate from a scaffold's last textarea to the Next button after commit.
 */
async function tabToNextAndActivate(user: ReturnType<typeof userEvent.setup>, tabs = 9) {
  for (let i = 0; i < tabs; i++) {
    await user.keyboard('{Tab}')
  }
  await user.keyboard('{Enter}')
}

// ── Inputs ────────────────────────────────────────────────────────────────────
// Chosen so that the assembled word count is within 5% of 378 (range: 359–397).

const AIM_INPUTS = [
  'vanilla custard French toast with a caramel glaze',
  'Thermomix TM6',
  'efficiency and consistency in commercial food production environments',
  'sixty second TikTok video',
]

// Issue 1 and 2 are committed but overwritten by issue 3 (same section key).
// Short inputs — only issue 3 text counts toward final word count.
const ISSUE1_INPUTS = [
  'food safety',
  'commercial kitchens handle high risk ingredients',
  'Food Standards Australia 2024',
  'food poisoning affects millions annually',
  'precise temperature control prevents contamination',
]

const ISSUE2_INPUTS = [
  'kitchen technology',
  'automation improves speed and consistency',
  'CSIRO Food Innovation 2023',
  'automated equipment reduces preparation time',
  'Thermomix automates complex cooking processes',
]

const ISSUE3_INPUTS = [
  'sustainability and ethical sourcing',
  'consumer demand for sustainable products has increased significantly in recent years',
  'the Australian Institute of Food Science and Technology 2023',
  'eighty percent of Australian consumers prefer sustainably sourced food products',
  'sourcing local seasonal produce demonstrates environmental responsibility',
]

const DECISION_INPUT =
  'the group will produce vanilla custard French toast with caramel glaze using the Thermomix TM6 in order to demonstrate commercial kitchen technology documented through a sixty second TikTok video targeting secondary food and hospitality students'

const JUSTIFICATION_INPUTS = [
  'this dish directly addresses food safety because the Thermomix TM6 automatically maintains precise temperature control throughout the custard cooking process',
  'the Thermomix was selected because its automated mixing and precise temperature control demonstrates how commercial kitchen technology improves production efficiency and consistency',
  'sustainability is maintained throughout this task by sourcing locally grown seasonal ingredients which reduces transportation carbon emissions and supports Australian food producers',
  'a TikTok video was chosen because the target audience of secondary food and hospitality students primarily consumes and shares short form video content',
]

const IMPLEMENTATION_ROWS = [
  {
    what: 'research Thermomix capabilities and relevant safety procedures',
    why: 'understand the technology thoroughly before practical sessions begin',
  },
  {
    what: 'finalise recipe ingredients and create complete shopping list',
    why: 'ensure all components are available before the cooking day',
  },
  {
    what: 'conduct practical cooking session producing the assigned dish',
    why: 'produce the finished dish using the assigned kitchen technology',
  },
  {
    what: 'film the complete production process with commentary narration',
    why: 'capture all required footage for editing the TikTok video',
  },
  {
    what: 'edit video footage and add captions transitions and effects',
    why: 'create polished sixty second TikTok video for submission',
  },
  {
    what: 'submit completed action plan and final video production',
    why: 'meet the assessment deadline and complete all requirements',
  },
]

// ── Walkthrough ───────────────────────────────────────────────────────────────

describe('Keyboard walkthrough — full 18-slide lesson', () => {
  it('navigates keyboard-only from cold load to review and verifies word count', async () => {
    const user = userEvent.setup()

    render(
      <LessonProvider
        initialState={makeLessonState(kitchenTechnologies.id, kitchenTechnologies.slides)}
      >
        <LessonShell lesson={kitchenTechnologies} />
      </LessonProvider>
    )

    // ── Slide 1: Orientation content (index 0) ──────────────────────────────
    expect(screen.getByText('1 of 18')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Welcome to the Action Plan lesson' })
    ).toBeInTheDocument()
    // Content slide: focus is on container div (not a text input) → ArrowRight advances
    await user.keyboard('{ArrowRight}')

    // ── Slide 2: Rules content (index 1) ───────────────────────────────────
    expect(screen.getByText('2 of 18')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Four rules for your Action Plan' })
    ).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')

    // ── Slide 3: MCQ rule-check self (index 2) ─────────────────────────────
    expect(screen.getByText('3 of 18')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Which sentence follows the Action Plan rules?' })
    ).toBeInTheDocument()
    // Option B (index 1) is correct → press '2' to select
    await user.keyboard('2')
    // Submit with Cmd+Enter
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    // After correct, ArrowRight advances
    await user.keyboard('{ArrowRight}')

    // ── Slide 4: Aim intro content (index 3) ───────────────────────────────
    expect(screen.getByText('4 of 18')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')

    // ── Slide 5: Aim scaffold — framed (index 4) ───────────────────────────
    expect(screen.getByText('5 of 18')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Write the Aim for your Action Plan.' })
    ).toBeInTheDocument()
    // useFocusOnMount puts focus on first textarea
    // Type each prompt and Tab to the next
    for (let i = 0; i < AIM_INPUTS.length; i++) {
      if (i > 0) await user.keyboard('{Tab}')
      await user.keyboard(AIM_INPUTS[i])
    }
    // Commit via Cmd+Enter (focus is on last textarea, article's onKeyDown handles it)
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    // Verify section appears in ActionPlanPanel
    const panel = screen.getByRole('complementary', { name: 'Action Plan so far' })
    expect(within(panel).queryAllByText('Not yet written').length).toBeGreaterThan(0) // other sections still empty
    // Tab to Next button (9 Tabs) + Enter to advance
    await tabToNextAndActivate(user)

    // ── Slide 6: Issues intro content (index 5) ───────────────────────────
    expect(screen.getByText('6 of 18')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')

    // ── Slide 7: TEE check MCQ self (index 6) ─────────────────────────────
    expect(screen.getByText('7 of 18')).toBeInTheDocument()
    // Option B is correct → '2'
    await user.keyboard('2')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await user.keyboard('{ArrowRight}')

    // ── Slide 8: Issue 1 scaffold — framed (index 7) ──────────────────────
    expect(screen.getByText('8 of 18')).toBeInTheDocument()
    for (let i = 0; i < ISSUE1_INPUTS.length; i++) {
      if (i > 0) await user.keyboard('{Tab}')
      await user.keyboard(ISSUE1_INPUTS[i])
    }
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 9: Issue 2 scaffold — framed (index 8) ──────────────────────
    expect(screen.getByText('9 of 18')).toBeInTheDocument()
    for (let i = 0; i < ISSUE2_INPUTS.length; i++) {
      if (i > 0) await user.keyboard('{Tab}')
      await user.keyboard(ISSUE2_INPUTS[i])
    }
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 10: Issue 3 scaffold — framed (index 9) ─────────────────────
    expect(screen.getByText('10 of 18')).toBeInTheDocument()
    for (let i = 0; i < ISSUE3_INPUTS.length; i++) {
      if (i > 0) await user.keyboard('{Tab}')
      await user.keyboard(ISSUE3_INPUTS[i])
    }
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 11: Decision intro content (index 10) ───────────────────────
    expect(screen.getByText('11 of 18')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')

    // ── Slide 12: Decision scaffold — guided (index 11) ───────────────────
    expect(screen.getByText('12 of 18')).toBeInTheDocument()
    await user.keyboard(DECISION_INPUT)
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 13: Justification scaffold — guided (index 12) ──────────────
    expect(screen.getByText('13 of 18')).toBeInTheDocument()
    for (let i = 0; i < JUSTIFICATION_INPUTS.length; i++) {
      if (i > 0) await user.keyboard('{Tab}')
      await user.keyboard(JUSTIFICATION_INPUTS[i])
    }
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 14: Implementation intro content (index 13) ─────────────────
    expect(screen.getByText('14 of 18')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')

    // ── Slide 15: Implementation scaffold — freeform-table (index 14) ──────
    expect(screen.getByText('15 of 18')).toBeInTheDocument()
    // useFocusOnMount focuses first tabbable element = When 1 (auto-filled, read-only)
    // Tab to What 1, type, Tab to Why 1, type; then for each remaining row: Tab(When), Tab(What), type, Tab(Why), type
    for (let i = 0; i < IMPLEMENTATION_ROWS.length; i++) {
      if (i === 0) {
        // From When 1: Tab to What 1
        await user.keyboard('{Tab}')
        await user.keyboard(IMPLEMENTATION_ROWS[i].what)
        await user.keyboard('{Tab}')
        await user.keyboard(IMPLEMENTATION_ROWS[i].why)
      } else {
        // Tab past When (i+1) to What (i+1)
        await user.keyboard('{Tab}') // Tab to When(i+1)
        await user.keyboard('{Tab}') // Tab to What(i+1)
        await user.keyboard(IMPLEMENTATION_ROWS[i].what)
        await user.keyboard('{Tab}')
        await user.keyboard(IMPLEMENTATION_ROWS[i].why)
      }
    }
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 16: References content (index 15) ────────────────────────────
    expect(screen.getByText('16 of 18')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')

    // ── Slide 17: References scaffold — freeform-table (index 16) ──────────
    expect(screen.getByText('17 of 18')).toBeInTheDocument()
    // On mount, focus is on the Type select (first tabbable in ReferenceBuilder).
    // Tab past: Authors → Year → Title → Source → URL → Accessed → table textarea
    for (let i = 0; i < 7; i++) {
      await user.keyboard('{Tab}')
    }
    await user.keyboard('Smith, J. (2023). How to cook custard. Cooking Today. https://example.com')
    await user.keyboard('{Meta>}{Enter}{/Meta}')
    await tabToNextAndActivate(user)

    // ── Slide 18: Review slide (index 17) ─────────────────────────────────
    expect(screen.getByText('18 of 18')).toBeInTheDocument()

    // Assert 6 section headings are rendered in the Raw panel
    const rawPanel = screen.getByRole('tabpanel', { name: 'Raw' })
    const headings = within(rawPanel).getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(6)
    expect(headings.map((h) => h.textContent)).toEqual([
      'Aim',
      'Issues',
      'Decision',
      'Justification',
      'Implementation',
      'References',
    ])

    // All committed sections are shown — references is now committed via the scaffold slide
    expect(within(rawPanel).queryAllByText('Not yet written')).toHaveLength(0)

    // Word count: the assembled paragraphs (including the references table) total ~395 words.
    // Assert within 5% of 395 (range 375–415).
    const wordCountEl = screen.getByTestId('word-count')
    const countText = wordCountEl.textContent ?? '0 words'
    const count = parseInt(countText.match(/\d+/)?.[0] ?? '0', 10)
    expect(count).toBeGreaterThanOrEqual(375)
    expect(count).toBeLessThanOrEqual(415)
  }, 30_000) // Allow 30 s for this long test
})
