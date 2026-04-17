/**
 * RevealControls tests.
 *
 * Verifies reveal state management, reveal-all, individual card reveal,
 * slide-change reset, and pin/hide behaviour.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RevealControls } from './RevealControls'
import type { GroupCard } from './RevealControls'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CARD_A: GroupCard = {
  groupId: 'g1',
  groupName: 'Alpha Team',
  paragraph: 'Alpha response text.',
}
const CARD_B: GroupCard = {
  groupId: 'g2',
  groupName: 'Beta Squad',
  paragraph: 'Beta response text.',
}
const CARD_C: GroupCard = { groupId: 'g3', groupName: 'Gamma Group', paragraph: null }

function setup(cards: GroupCard[] = [CARD_A, CARD_B, CARD_C], slideKey = 'slide-1') {
  return render(<RevealControls key={slideKey} cards={cards} theme="dark" />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RevealControls — initial hidden state', () => {
  it('all committed cards show "Response ready" before reveal', () => {
    setup()
    expect(screen.getByTestId('card-ready-g1')).toBeInTheDocument()
    expect(screen.getByTestId('card-ready-g2')).toBeInTheDocument()
  })

  it('uncommitted card shows "Waiting…" before reveal', () => {
    setup()
    expect(screen.getByTestId('card-waiting-g3')).toBeInTheDocument()
  })

  it('paragraph text is not visible before reveal', () => {
    setup()
    expect(screen.queryByTestId('card-paragraph-g1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-paragraph-g2')).not.toBeInTheDocument()
  })

  it('renders the "Reveal all" button', () => {
    setup()
    expect(screen.getByTestId('reveal-all-btn')).toBeInTheDocument()
  })
})

describe('RevealControls — reveal all', () => {
  it('clicking "Reveal all" shows paragraphs for all committed cards', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByTestId('reveal-all-btn'))

    expect(screen.getByTestId('card-paragraph-g1')).toHaveTextContent('Alpha response text.')
    expect(screen.getByTestId('card-paragraph-g2')).toHaveTextContent('Beta response text.')
  })

  it('"Waiting…" card stays as placeholder after reveal all', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByTestId('reveal-all-btn'))

    // Card C has no paragraph — still shows waiting, not a paragraph.
    expect(screen.queryByTestId('card-paragraph-g3')).not.toBeInTheDocument()
    expect(screen.getByText(/waiting for response/i)).toBeInTheDocument()
  })
})

describe('RevealControls — individual card reveal', () => {
  it('clicking a hidden committed card reveals only that card', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByTestId('response-card-g1'))

    // g1 revealed
    expect(screen.getByTestId('card-paragraph-g1')).toBeInTheDocument()
    // g2 still hidden
    expect(screen.queryByTestId('card-paragraph-g2')).not.toBeInTheDocument()
  })

  it('clicking a waiting card does not reveal it', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByTestId('response-card-g3'))

    // Still showing waiting text, not a paragraph
    expect(screen.queryByTestId('card-paragraph-g3')).not.toBeInTheDocument()
  })
})

describe('RevealControls — reset on slide change', () => {
  it('remounting with a new key resets all cards to hidden', async () => {
    const user = userEvent.setup()
    const { rerender } = setup([CARD_A, CARD_B], 'slide-1')

    // Reveal all
    await user.click(screen.getByTestId('reveal-all-btn'))
    expect(screen.getByTestId('card-paragraph-g1')).toBeInTheDocument()

    // Simulate slide change — new key forces unmount + remount, resetting state.
    rerender(<RevealControls key="slide-2" cards={[CARD_A, CARD_B]} theme="dark" />)

    // All should be hidden again
    expect(screen.queryByTestId('card-paragraph-g1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-paragraph-g2')).not.toBeInTheDocument()
  })
})

describe('RevealControls — pin', () => {
  it('pinning a card moves it to the top of the grid', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    // Reveal g2 first
    await user.click(screen.getByTestId('response-card-g2'))
    expect(screen.getByTestId('card-paragraph-g2')).toBeInTheDocument()

    // Pin g2
    await user.click(screen.getByTestId('pin-g2'))

    // g2 should be first in the grid
    const grid = screen.getByTestId('card-grid')
    const cards = within(grid).getAllByRole('article')
    expect(cards[0]).toHaveAttribute('data-testid', 'response-card-g2')
  })

  it('unpinning returns the card to its original position', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    // Reveal both
    await user.click(screen.getByTestId('reveal-all-btn'))

    // Pin then unpin g2
    await user.click(screen.getByTestId('pin-g2'))
    await user.click(screen.getByTestId('unpin-g2'))

    const grid = screen.getByTestId('card-grid')
    const cards = within(grid).getAllByRole('article')
    expect(cards[0]).toHaveAttribute('data-testid', 'response-card-g1')
    expect(cards[1]).toHaveAttribute('data-testid', 'response-card-g2')
  })

  it('shows "(pinned)" label on pinned card', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    await user.click(screen.getByTestId('reveal-all-btn'))
    await user.click(screen.getByTestId('pin-g1'))

    const card = screen.getByTestId('response-card-g1')
    expect(within(card).getByText(/pinned/i)).toBeInTheDocument()
  })
})

describe('RevealControls — hide', () => {
  it('hiding a card removes it from the visible grid', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    await user.click(screen.getByTestId('reveal-all-btn'))
    await user.click(screen.getByTestId('hide-g2'))

    expect(screen.queryByTestId('response-card-g2')).not.toBeInTheDocument()
  })

  it('shows "Show N hidden card(s)" toggle after hiding', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    await user.click(screen.getByTestId('reveal-all-btn'))
    await user.click(screen.getByTestId('hide-g2'))

    expect(screen.getByTestId('show-hidden-toggle')).toHaveTextContent(/show 1 hidden card/i)
  })

  it('toggling "Show hidden" makes the hidden card visible with muted style', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    await user.click(screen.getByTestId('reveal-all-btn'))
    await user.click(screen.getByTestId('hide-g2'))
    await user.click(screen.getByTestId('show-hidden-toggle'))

    const card = screen.getByTestId('response-card-g2')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('opacity-50')
  })

  it('clicking unhide on a visible-hidden card removes muted style', async () => {
    const user = userEvent.setup()
    setup([CARD_A, CARD_B], 'slide-1')

    await user.click(screen.getByTestId('reveal-all-btn'))
    await user.click(screen.getByTestId('hide-g2'))
    await user.click(screen.getByTestId('show-hidden-toggle'))
    await user.click(screen.getByTestId('unhide-g2'))

    // Should be back to normal
    const card = screen.getByTestId('response-card-g2')
    expect(card).not.toHaveClass('opacity-50')
  })
})

describe('RevealControls — empty state', () => {
  it('shows no-groups message when cards is empty', () => {
    setup([], 'slide-1')
    expect(screen.getByText(/no groups found/i)).toBeInTheDocument()
  })

  it('"Reveal all" is disabled when no committed cards exist', () => {
    setup([CARD_C], 'slide-1')
    expect(screen.getByTestId('reveal-all-btn')).toBeDisabled()
  })
})

describe('RevealControls — glow on reveal (prefers-reduced-motion: no-preference)', () => {
  it('revealed card has ring class immediately after reveal', async () => {
    const user = userEvent.setup()
    setup([CARD_A], 'slide-1')

    await user.click(screen.getByTestId('response-card-g1'))

    // Ring applied right after reveal (2-second glow window).
    expect(screen.getByTestId('response-card-g1')).toHaveClass('ring-2')
  })
})
