/**
 * ConnectionBanner tests.
 *
 * Verifies:
 *   - Banner renders when offline (navigator.onLine = false).
 *   - Banner does not render when online.
 *   - Dismiss button hides the banner for the current offline period.
 *   - Banner reappears after going offline again post-dismiss.
 *   - role="alert" is present for screen readers.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionBanner } from './ConnectionBanner'

afterEach(() => {
  vi.unstubAllGlobals()
})

function setOnline(online: boolean) {
  vi.stubGlobal('navigator', { ...navigator, onLine: online })
}

describe('ConnectionBanner — offline state', () => {
  it('renders the banner when navigator.onLine is false', () => {
    setOnline(false)
    render(<ConnectionBanner />)
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument()
    expect(screen.getByTestId('connection-banner')).toHaveAttribute('role', 'alert')
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument()
  })

  it('does not render the banner when navigator.onLine is true', () => {
    setOnline(true)
    render(<ConnectionBanner />)
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument()
  })
})

describe('ConnectionBanner — dismiss', () => {
  it('hides the banner when dismiss is clicked', async () => {
    const user = userEvent.setup()
    setOnline(false)
    render(<ConnectionBanner />)
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument()

    await user.click(screen.getByTestId('connection-banner-dismiss'))
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument()
  })

  it('reappears when the connection drops again after dismiss', async () => {
    const user = userEvent.setup()
    setOnline(false)
    render(<ConnectionBanner />)

    // Dismiss the banner
    await user.click(screen.getByTestId('connection-banner-dismiss'))
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument()

    // Simulate going online (clears dismissed flag)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument()

    // Simulate going offline again — banner should reappear
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument()
  })
})

describe('ConnectionBanner — online/offline events', () => {
  it('shows the banner when the offline event fires', () => {
    setOnline(true)
    render(<ConnectionBanner />)
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument()
  })

  it('hides the banner when the online event fires', () => {
    setOnline(false)
    render(<ConnectionBanner />)
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument()
  })
})
