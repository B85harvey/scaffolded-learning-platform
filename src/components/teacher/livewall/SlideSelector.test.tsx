/**
 * SlideSelector tests.
 *
 * Verifies that the correct buttons render for scaffold and class-check MCQ
 * slides, and that selecting a slide marks it as active.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlideSelector } from './SlideSelector'
import type { WallSlide } from './SlideSelector'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCAFFOLD_AIM: WallSlide = {
  slideId: 'slide-1',
  type: 'scaffold',
  label: 'Aim',
  section: 'aim',
}

const SCAFFOLD_ISSUES: WallSlide = {
  slideId: 'slide-2',
  type: 'scaffold',
  label: 'Issues',
  section: 'issues',
}

const MCQ_CLASS_CHECK: WallSlide = {
  slideId: 'slide-3',
  type: 'mcq',
  label: 'Which tool is used to…',
}

const ALL_SLIDES = [SCAFFOLD_AIM, SCAFFOLD_ISSUES, MCQ_CLASS_CHECK]

function setup(
  slides: WallSlide[] = ALL_SLIDES,
  selectedSlideId: string | null = null,
  onSelect = vi.fn()
) {
  render(
    <SlideSelector
      slides={slides}
      selectedSlideId={selectedSlideId}
      onSelect={onSelect}
      theme="dark"
    />
  )
  return { onSelect }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SlideSelector — rendering', () => {
  it('renders one button per slide', () => {
    setup()
    expect(screen.getByTestId('slide-btn-slide-1')).toBeInTheDocument()
    expect(screen.getByTestId('slide-btn-slide-2')).toBeInTheDocument()
    expect(screen.getByTestId('slide-btn-slide-3')).toBeInTheDocument()
  })

  it('shows correct labels for scaffold and MCQ slides', () => {
    setup()
    expect(screen.getByText('Aim')).toBeInTheDocument()
    expect(screen.getByText('Issues')).toBeInTheDocument()
    expect(screen.getByText('Which tool is used to…')).toBeInTheDocument()
  })

  it('shows empty state when no slides', () => {
    setup([])
    expect(screen.getByText(/no scaffold or class-check slides/i)).toBeInTheDocument()
  })
})

describe('SlideSelector — active state', () => {
  it('marks the selected slide button as pressed', () => {
    setup(ALL_SLIDES, 'slide-2')
    expect(screen.getByTestId('slide-btn-slide-2')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('slide-btn-slide-1')).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a slide calls onSelect with the correct slide', async () => {
    const user = userEvent.setup()
    const { onSelect } = setup(ALL_SLIDES, 'slide-1')

    await user.click(screen.getByTestId('slide-btn-slide-2'))

    expect(onSelect).toHaveBeenCalledWith(SCAFFOLD_ISSUES)
  })

  it('clicking Issues makes it the active button', async () => {
    const user = userEvent.setup()
    let selected: WallSlide | null = SCAFFOLD_AIM

    const { rerender } = render(
      <SlideSelector
        slides={ALL_SLIDES}
        selectedSlideId={selected.slideId}
        onSelect={(s) => {
          selected = s
        }}
        theme="dark"
      />
    )

    await user.click(screen.getByText('Issues'))

    rerender(
      <SlideSelector
        slides={ALL_SLIDES}
        selectedSlideId={selected?.slideId ?? null}
        onSelect={(s) => {
          selected = s
        }}
        theme="dark"
      />
    )

    expect(screen.getByTestId('slide-btn-slide-2')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('SlideSelector — theme', () => {
  it('renders with light theme without error', () => {
    render(
      <SlideSelector slides={ALL_SLIDES} selectedSlideId={null} onSelect={vi.fn()} theme="light" />
    )
    expect(screen.getByTestId('slide-selector')).toBeInTheDocument()
  })
})
