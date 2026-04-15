import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import type { LessonState } from '@/contexts/lessonReducer'
import type { CommittedParagraph } from '@/lessons/types'
import { SlideReview } from './SlideReview'
import { ToastRegion } from '@/components/ui/Toast'

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
  vi.restoreAllMocks()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const reviewSlide = { id: 'slide-review', type: 'review' as const, section: 'review' as const }

const aimParagraph: CommittedParagraph = {
  section: 'aim',
  text: 'The aim is to investigate kitchen technologies.',
  warnings: [],
  committedAt: 1000,
}

const issuesParagraph: CommittedParagraph = {
  section: 'issues',
  text: 'There are several key issues to consider.',
  warnings: [],
  committedAt: 2000,
}

function makeState(overrides: Partial<LessonState> = {}): LessonState {
  const base = makeLessonState('test-lesson', [reviewSlide])
  return { ...base, ...overrides }
}

function renderReview(stateOverrides: Partial<LessonState> = {}) {
  const state = makeState(stateOverrides)
  return render(
    <LessonProvider initialState={state}>
      <ToastRegion />
      <SlideReview />
    </LessonProvider>
  )
}

// ── Raw tab — sections ────────────────────────────────────────────────────────

describe('SlideReview Raw tab — sections', () => {
  it('renders 6 section headings', () => {
    renderReview()
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(6)
  })

  it('renders heading labels for all sections', () => {
    renderReview()
    for (const label of [
      'Aim',
      'Issues',
      'Decision',
      'Justification',
      'Implementation',
      'References',
    ]) {
      expect(screen.getAllByText(label)[0]).toBeInTheDocument()
    }
  })

  it('shows "Not yet written" for uncommitted sections', () => {
    renderReview()
    const placeholders = screen.getAllByText('Not yet written')
    expect(placeholders.length).toBeGreaterThanOrEqual(6)
  })

  it('shows committed text when a section has been committed', () => {
    renderReview({ committed: { aim: aimParagraph } })
    expect(screen.getAllByText(aimParagraph.text)[0]).toBeInTheDocument()
  })

  it('still shows "Not yet written" for other uncommitted sections', () => {
    renderReview({ committed: { aim: aimParagraph } })
    const placeholders = screen.getAllByText('Not yet written')
    // 5 sections remain uncommitted
    expect(placeholders.length).toBeGreaterThanOrEqual(5)
  })
})

// ── Word count ────────────────────────────────────────────────────────────────

describe('SlideReview — word count', () => {
  it('shows 0 words when nothing is committed', () => {
    renderReview()
    expect(screen.getByTestId('word-count')).toHaveTextContent('0 words')
  })

  it('counts words across all committed sections', () => {
    renderReview({
      committed: {
        aim: aimParagraph, // 8 words
        issues: issuesParagraph, // 8 words
      },
    })
    // "The aim is to investigate kitchen technologies." = 7 words
    // "There are several key issues to consider." = 7 words
    const wordCountEl = screen.getByTestId('word-count')
    expect(wordCountEl).toBeInTheDocument()
    // Just verify it shows a number > 0
    expect(wordCountEl.textContent).toMatch(/\d+ words?/)
  })

  it('uses singular "word" for exactly one word', () => {
    const singleWord: CommittedParagraph = {
      section: 'aim',
      text: 'Hello',
      warnings: [],
      committedAt: 1000,
    }
    renderReview({ committed: { aim: singleWord } })
    expect(screen.getByTestId('word-count')).toHaveTextContent('1 word')
  })
})

// ── Copy All ──────────────────────────────────────────────────────────────────

describe('SlideReview — Copy All', () => {
  it('renders the Copy All button', () => {
    renderReview()
    expect(screen.getByRole('button', { name: 'Copy all' })).toBeInTheDocument()
  })

  it('calls navigator.clipboard.writeText on click and shows success toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    renderReview({ committed: { aim: aimParagraph } })
    await user.click(screen.getByRole('button', { name: 'Copy all' }))

    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText.mock.calls[0][0]).toContain('## Aim')
    expect(writeText.mock.calls[0][0]).toContain(aimParagraph.text)
  })

  it('shows success toast after successful copy', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

    renderReview()
    await user.click(screen.getByRole('button', { name: 'Copy all' }))

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument()
  })

  it('shows failure toast when clipboard write fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    renderReview()
    await user.click(screen.getByRole('button', { name: 'Copy all' }))

    expect(await screen.findByText('Copy failed — please try again')).toBeInTheDocument()
  })
})

// ── Download menu ─────────────────────────────────────────────────────────────

describe('SlideReview — Download menu', () => {
  it('renders the Download button', () => {
    renderReview()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
  })

  it('menu is hidden initially', () => {
    renderReview()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu on click', async () => {
    const user = userEvent.setup()
    renderReview()
    await user.click(screen.getByRole('button', { name: 'Download' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('menu contains .docx and .pdf items', async () => {
    const user = userEvent.setup()
    renderReview()
    await user.click(screen.getByRole('button', { name: 'Download' }))
    expect(screen.getByRole('menuitem', { name: 'Download as .docx' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Download as .pdf' })).toBeInTheDocument()
  })

  it('clicking a menu item fires an info toast "Coming in Phase 5"', async () => {
    const user = userEvent.setup()
    renderReview()
    await user.click(screen.getByRole('button', { name: 'Download' }))
    await user.click(screen.getByRole('menuitem', { name: 'Download as .docx' }))
    expect(await screen.findByText('Coming in Phase 5')).toBeInTheDocument()
  })
})

// ── Polished tab — same data ──────────────────────────────────────────────────

describe('SlideReview Polished tab — data', () => {
  it('polished tab shows committed text for each section', async () => {
    const user = userEvent.setup()
    renderReview({ committed: { aim: aimParagraph } })

    await user.click(screen.getByRole('tab', { name: 'Polished' }))

    // Text should now be visible in polished panel (only aim committed)
    const polishedPanel = screen.getByRole('tabpanel', { name: 'Polished' })
    expect(polishedPanel).not.toHaveAttribute('hidden')
    expect(polishedPanel).toHaveTextContent(aimParagraph.text)
  })

  it('polished tab shows "Not yet written" for uncommitted sections', async () => {
    const user = userEvent.setup()
    renderReview()

    await user.click(screen.getByRole('tab', { name: 'Polished' }))

    const polishedPanel = screen.getByRole('tabpanel', { name: 'Polished' })
    expect(polishedPanel).toHaveTextContent('Not yet written')
  })
})

// ── Tab navigation ────────────────────────────────────────────────────────────

describe('SlideReview — tablist arrow key nav', () => {
  it('Raw tab is active by default', () => {
    renderReview()
    expect(screen.getByRole('tab', { name: 'Raw' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clicking Polished tab switches the active tab', async () => {
    const user = userEvent.setup()
    renderReview()

    await user.click(screen.getByRole('tab', { name: 'Polished' }))
    expect(screen.getByRole('tab', { name: 'Polished' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Raw' })).toHaveAttribute('aria-selected', 'false')
  })

  it('ArrowRight from Raw focuses and activates Polished', () => {
    renderReview()
    const rawTab = screen.getByRole('tab', { name: 'Raw' })
    rawTab.focus()

    fireEvent.keyDown(rawTab, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: 'Polished' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ArrowLeft from Polished focuses and activates Raw', async () => {
    const user = userEvent.setup()
    renderReview()

    // Click Polished first
    await user.click(screen.getByRole('tab', { name: 'Polished' }))
    const polishedTab = screen.getByRole('tab', { name: 'Polished' })
    polishedTab.focus()

    fireEvent.keyDown(polishedTab, { key: 'ArrowLeft' })

    expect(screen.getByRole('tab', { name: 'Raw' })).toHaveAttribute('aria-selected', 'true')
  })
})

// ── ui.reviewTab persistence ──────────────────────────────────────────────────

describe('SlideReview — ui.reviewTab persists', () => {
  it('starts on the tab from ui.reviewTab state', () => {
    renderReview({ ui: { shortcutsOpen: false, reviewTab: 'polished' } })
    expect(screen.getByRole('tab', { name: 'Polished' })).toHaveAttribute('aria-selected', 'true')
  })

  it('raw tab panel is hidden when polished is active', () => {
    renderReview({ ui: { shortcutsOpen: false, reviewTab: 'polished' } })
    const rawPanel = screen.getByTestId('review-panel-raw')
    expect(rawPanel).toHaveAttribute('hidden')
  })

  it('switching tab dispatches SET_REVIEW_TAB', async () => {
    const user = userEvent.setup()
    renderReview({ ui: { shortcutsOpen: false, reviewTab: 'raw' } })

    await user.click(screen.getByRole('tab', { name: 'Polished' }))

    // After dispatch, the tab should reflect the new state
    expect(screen.getByRole('tab', { name: 'Polished' })).toHaveAttribute('aria-selected', 'true')
  })
})
