import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import { SlideFrame } from './SlideFrame'
import type { SlideConfig } from '@/lessons/types'

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

const slide: SlideConfig = {
  id: 'slide-01',
  type: 'content',
  section: 'orientation',
  body: 'Welcome.',
}

function renderFrame(isLocked: boolean) {
  const state = makeLessonState('test-lesson', [slide])
  return render(
    <LessonProvider initialState={state}>
      <SlideFrame slide={slide} isLocked={isLocked}>
        <p>Slide content</p>
      </SlideFrame>
    </LessonProvider>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LockOverlay — when not locked', () => {
  it('does not render the overlay', () => {
    renderFrame(false)
    expect(screen.queryByTestId('lock-overlay')).not.toBeInTheDocument()
  })

  it('slide content is visible and not inert', () => {
    renderFrame(false)
    const content = screen.getByTestId('slide-content')
    expect(content).toBeInTheDocument()
    expect(content).not.toHaveAttribute('inert')
  })
})

describe('LockOverlay — when locked', () => {
  it('renders the overlay', () => {
    renderFrame(true)
    expect(screen.getByTestId('lock-overlay')).toBeInTheDocument()
  })

  it('overlay has role="dialog" and aria-modal="true"', () => {
    renderFrame(true)
    const overlay = screen.getByTestId('lock-overlay')
    expect(overlay).toHaveAttribute('role', 'dialog')
    expect(overlay).toHaveAttribute('aria-modal', 'true')
  })

  it('renders the "Waiting for your teacher" heading', () => {
    renderFrame(true)
    expect(screen.getByRole('heading', { name: 'Waiting for your teacher' })).toBeInTheDocument()
  })

  it('renders the "OK, I\'ll wait" button for focus trap', () => {
    renderFrame(true)
    expect(screen.getByRole('button', { name: "OK, I'll wait" })).toBeInTheDocument()
  })

  it('the "OK, I\'ll wait" button is inside the dialog overlay', () => {
    renderFrame(true)
    const overlay = screen.getByTestId('lock-overlay')
    const button = screen.getByRole('button', { name: "OK, I'll wait" })
    expect(overlay).toContainElement(button)
  })

  it('slide content remains in the DOM (slide stays visible beneath scrim)', () => {
    renderFrame(true)
    expect(screen.getByText('Slide content')).toBeInTheDocument()
  })

  it('slide content is marked inert when locked', () => {
    renderFrame(true)
    const content = screen.getByTestId('slide-content')
    expect(content).toHaveAttribute('inert')
  })

  it('applies a 50 % white scrim (rgba(255,255,255,0.5))', () => {
    renderFrame(true)
    const overlay = screen.getByTestId('lock-overlay')
    expect(overlay).toHaveStyle({ backgroundColor: 'rgba(255,255,255,0.5)' })
  })
})
