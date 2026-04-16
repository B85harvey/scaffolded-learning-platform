/**
 * SaveStatusChip tests.
 *
 * Uses the module-level setSyncStatus bus to drive state changes, and fake
 * timers to verify the 3-second "Saved" fade.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SaveStatusChip } from './SaveStatusChip'
import { setSyncStatus } from '@/contexts/SyncStatusContext'

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  // Reset to idle before each test
  act(() => setSyncStatus('idle'))
})

afterEach(() => {
  vi.useRealTimers()
  act(() => setSyncStatus('idle'))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SaveStatusChip — saving', () => {
  it('renders "Saving..." when status is saving', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('saving'))

    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })
})

describe('SaveStatusChip — saved', () => {
  it('renders "Saved" when status is saved', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('saved'))

    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('"Saved" is no longer visible after 3 seconds', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('saved'))
    expect(screen.getByText('Saved')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('"Saved" is still visible before 3 seconds elapse', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('saved'))

    act(() => {
      vi.advanceTimersByTime(2999)
    })

    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})

describe('SaveStatusChip — error', () => {
  it('renders "Connection lost" when status is error', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('error'))

    expect(screen.getByText('Connection lost')).toBeInTheDocument()
  })

  it('"Connection lost" persists beyond 3 seconds', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('error'))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByText('Connection lost')).toBeInTheDocument()
  })

  it('has a tooltip describing local-save behaviour', () => {
    render(<SaveStatusChip />)

    act(() => setSyncStatus('error'))

    const text = screen.getByText('Connection lost')
    expect(text).toHaveAttribute(
      'title',
      'Your work is saved locally. It will sync when the connection returns.'
    )
  })
})

describe('SaveStatusChip — idle', () => {
  it('renders nothing visible when status is idle', () => {
    render(<SaveStatusChip />)
    // status starts idle — neither saving/saved/error text should be present
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
  })

  it('has a stable aria-live region at all times', () => {
    render(<SaveStatusChip />)
    expect(screen.getByTestId('save-status-chip')).toHaveAttribute('aria-live', 'polite')
  })
})
