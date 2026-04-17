/**
 * ResponseCard tests.
 *
 * Verifies committed / waiting states, font sizes, pin / hide controls,
 * and the card-reveal-enter animation class on revealed paragraphs.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResponseCard } from './ResponseCard'

// ── Default props ─────────────────────────────────────────────────────────────

const BASE = {
  groupId: 'group-1',
  groupName: 'The Grillmasters',
  paragraph: 'Sous vide is a method of cooking in which food is placed in a bag.' as string | null,
  isRevealed: true,
  isPinned: false,
  isHidden: false,
  showHidden: false,
  justRevealed: false,
  onReveal: vi.fn(),
  onPin: vi.fn(),
  onUnpin: vi.fn(),
  onHide: vi.fn(),
  onUnhide: vi.fn(),
  theme: 'dark' as 'dark' | 'light',
}

function setup(overrides: Partial<typeof BASE> = {}) {
  render(<ResponseCard {...BASE} {...overrides} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResponseCard — committed group (revealed)', () => {
  it('renders the group name', () => {
    setup()
    expect(screen.getByTestId('card-group-name-group-1')).toHaveTextContent('The Grillmasters')
  })

  it('group name is at least 24px', () => {
    setup()
    const heading = screen.getByTestId('card-group-name-group-1')
    expect(heading).toHaveStyle({ fontSize: '24px' })
  })

  it('renders the committed paragraph', () => {
    setup()
    expect(screen.getByTestId('card-paragraph-group-1')).toHaveTextContent(
      'Sous vide is a method of cooking in which food is placed in a bag.'
    )
  })

  it('paragraph is at least 20px', () => {
    setup()
    expect(screen.getByTestId('card-paragraph-group-1')).toHaveStyle({ fontSize: '20px' })
  })
})

describe('ResponseCard — uncommitted group (waiting)', () => {
  it('shows "Waiting for response…" when no paragraph', () => {
    setup({ paragraph: null, isRevealed: false })
    expect(screen.getByTestId('card-waiting-group-1')).toBeInTheDocument()
    expect(screen.getByTestId('card-waiting-group-1')).toHaveTextContent(/waiting for response/i)
  })

  it('shows "Waiting for response…" when revealed but no paragraph', () => {
    setup({ paragraph: null, isRevealed: true })
    // The waiting message should appear in the revealed section.
    expect(screen.getByText(/waiting for response/i)).toBeInTheDocument()
  })
})

describe('ResponseCard — hidden state', () => {
  it('shows "Response ready" when hidden but has a paragraph', () => {
    setup({ isRevealed: false, paragraph: 'Some text' })
    expect(screen.getByTestId('card-ready-group-1')).toHaveTextContent(/response ready/i)
  })

  it('does not render when hidden and showHidden is false', () => {
    setup({ isHidden: true, showHidden: false })
    expect(screen.queryByTestId('response-card-group-1')).not.toBeInTheDocument()
  })

  it('renders with muted style when hidden and showHidden is true', () => {
    setup({ isHidden: true, showHidden: true, isRevealed: true })
    const card = screen.getByTestId('response-card-group-1')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('opacity-50')
  })
})

describe('ResponseCard — click to reveal', () => {
  it('clicking a hidden card with a response calls onReveal', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn()
    setup({ isRevealed: false, paragraph: 'Some text', onReveal })

    await user.click(screen.getByTestId('response-card-group-1'))

    expect(onReveal).toHaveBeenCalledOnce()
  })

  it('clicking a waiting card (no paragraph) does not call onReveal', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn()
    setup({ isRevealed: false, paragraph: null, onReveal })

    await user.click(screen.getByTestId('response-card-group-1'))

    expect(onReveal).not.toHaveBeenCalled()
  })
})

describe('ResponseCard — pin and hide controls', () => {
  it('renders pin and hide buttons on a revealed card', () => {
    setup({ isRevealed: true })
    expect(screen.getByTestId('pin-group-1')).toBeInTheDocument()
    expect(screen.getByTestId('hide-group-1')).toBeInTheDocument()
  })

  it('does not render pin/hide on a hidden card', () => {
    setup({ isRevealed: true, isHidden: true, showHidden: true })
    expect(screen.queryByTestId('pin-group-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('hide-group-1')).not.toBeInTheDocument()
  })

  it('clicking pin calls onPin', async () => {
    const user = userEvent.setup()
    const onPin = vi.fn()
    setup({ isRevealed: true, onPin })

    await user.click(screen.getByTestId('pin-group-1'))

    expect(onPin).toHaveBeenCalledOnce()
  })

  it('clicking hide calls onHide', async () => {
    const user = userEvent.setup()
    const onHide = vi.fn()
    setup({ isRevealed: true, onHide })

    await user.click(screen.getByTestId('hide-group-1'))

    expect(onHide).toHaveBeenCalledOnce()
  })

  it('shows unpin button when card is pinned', () => {
    setup({ isRevealed: true, isPinned: true })
    expect(screen.getByTestId('unpin-group-1')).toBeInTheDocument()
    expect(screen.queryByTestId('pin-group-1')).not.toBeInTheDocument()
  })
})

describe('ResponseCard — glow on just-revealed', () => {
  it('applies ring class when justRevealed is true', () => {
    setup({ justRevealed: true })
    expect(screen.getByTestId('response-card-group-1')).toHaveClass('ring-2')
  })

  it('does not apply ring class when justRevealed is false', () => {
    setup({ justRevealed: false })
    expect(screen.getByTestId('response-card-group-1')).not.toHaveClass('ring-2')
  })
})

describe('ResponseCard — light theme', () => {
  it('renders in light theme without error', () => {
    setup({ theme: 'light' })
    expect(screen.getByTestId('response-card-group-1')).toBeInTheDocument()
  })
})

describe('ResponseCard — reveal animation', () => {
  it('revealed paragraph has card-reveal-enter class when reduced motion is off', () => {
    // Default test-setup stubs matchMedia to return matches:false (reduced motion off).
    setup({ isRevealed: true })
    expect(screen.getByTestId('card-paragraph-group-1')).toHaveClass('card-reveal-enter')
  })

  it('revealed paragraph does not have card-reveal-enter class when reduced motion is on', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    )
    setup({ isRevealed: true })
    expect(screen.getByTestId('card-paragraph-group-1')).not.toHaveClass('card-reveal-enter')
  })

  it('non-revealed card does not have card-reveal-enter class', () => {
    setup({ isRevealed: false })
    // No revealed paragraph element — card-paragraph testid should not exist
    expect(screen.queryByTestId('card-paragraph-group-1')).not.toBeInTheDocument()
  })
})
