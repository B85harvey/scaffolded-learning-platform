import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast, ToastRegion } from './Toast'

// ── matchMedia stub ───────────────────────────────────────────────────────────

function stubMatchMedia(reducedMotion = false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reducedMotion && query.includes('reduce'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

beforeEach(() => {
  stubMatchMedia(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// ── Render ────────────────────────────────────────────────────────────────────

describe('ToastRegion — render', () => {
  it('renders nothing when there are no toasts', () => {
    render(<ToastRegion />)
    expect(screen.queryByTestId('toast-region')).not.toBeInTheDocument()
  })

  it('renders the region and a toast item when toast() is called', () => {
    render(<ToastRegion />)
    act(() => {
      toast('Hello toast')
    })
    expect(screen.getByTestId('toast-region')).toBeInTheDocument()
    expect(screen.getByTestId('toast-item')).toBeInTheDocument()
    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })

  it('toast region has role="status" and aria-live="polite"', () => {
    render(<ToastRegion />)
    act(() => {
      toast('Test')
    })
    const region = screen.getByTestId('toast-region')
    expect(region).toHaveAttribute('role', 'status')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })
})

// ── Variants ──────────────────────────────────────────────────────────────────

describe('ToastRegion — variants', () => {
  it('success toast has green background class', () => {
    render(<ToastRegion />)
    act(() => {
      toast('Done', { variant: 'success' })
    })
    const item = screen.getByTestId('toast-item')
    expect(item.className).toContain('bg-ga-green')
  })

  it('info toast has primary background class', () => {
    render(<ToastRegion />)
    act(() => {
      toast('Info', { variant: 'info' })
    })
    const item = screen.getByTestId('toast-item')
    expect(item.className).toContain('bg-ga-primary')
  })
})

// ── Auto-dismiss ──────────────────────────────────────────────────────────────

describe('ToastRegion — auto-dismiss', () => {
  it('dismisses after 3 seconds', () => {
    vi.useFakeTimers()
    render(<ToastRegion />)

    act(() => {
      toast('Auto bye')
    })
    expect(screen.getByText('Auto bye')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByText('Auto bye')).not.toBeInTheDocument()
  })

  it('does not dismiss before 3 seconds', () => {
    vi.useFakeTimers()
    render(<ToastRegion />)

    act(() => {
      toast('Still here')
    })
    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(screen.getByText('Still here')).toBeInTheDocument()
  })
})

// ── Dismiss on click ──────────────────────────────────────────────────────────

describe('ToastRegion — dismiss on click', () => {
  it('dismisses when the toast button is clicked', async () => {
    const user = userEvent.setup()
    render(<ToastRegion />)

    act(() => {
      toast('Click me')
    })
    expect(screen.getByText('Click me')).toBeInTheDocument()

    await user.click(screen.getByTestId('toast-item'))
    expect(screen.queryByText('Click me')).not.toBeInTheDocument()
  })
})

// ── Stack up to 3 ─────────────────────────────────────────────────────────────

describe('ToastRegion — stacking', () => {
  it('shows up to 3 toasts', () => {
    render(<ToastRegion />)
    act(() => {
      toast('Toast 1')
      toast('Toast 2')
      toast('Toast 3')
    })
    expect(screen.getAllByTestId('toast-item')).toHaveLength(3)
  })

  it('drops the oldest toast when a 4th arrives (FIFO)', () => {
    render(<ToastRegion />)
    act(() => {
      toast('Toast 1')
      toast('Toast 2')
      toast('Toast 3')
      toast('Toast 4')
    })
    const items = screen.getAllByTestId('toast-item')
    expect(items).toHaveLength(3)
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
    expect(screen.getByText('Toast 4')).toBeInTheDocument()
  })
})

// ── Reduced motion ────────────────────────────────────────────────────────────

describe('ToastRegion — reduced motion', () => {
  it('applies toast-enter animation class when not reduced motion', () => {
    stubMatchMedia(false)
    render(<ToastRegion />)
    act(() => {
      toast('Animated')
    })
    const item = screen.getByTestId('toast-item')
    expect(item.className).toContain('toast-enter')
  })

  it('does not apply toast-enter animation class when reduced motion is preferred', () => {
    stubMatchMedia(true)
    render(<ToastRegion />)
    act(() => {
      toast('No anim')
    })
    const item = screen.getByTestId('toast-item')
    expect(item.className).not.toContain('toast-enter')
  })
})
