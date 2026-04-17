/**
 * McqBarChart tests.
 *
 * Verifies relative bar heights, correct-option colouring, percentage labels,
 * empty-state rendering, and the accessible aria-label.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { McqBarChart } from './McqBarChart'

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(overrides: Partial<React.ComponentProps<typeof McqBarChart>> = {}) {
  const defaults = {
    options: ['Cutting', 'Mixing', 'Chopping'],
    counts: [2, 5, 3],
    correctIndex: 1,
    total: 10,
  }
  render(<McqBarChart {...defaults} {...overrides} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('McqBarChart — bar rendering', () => {
  it('renders one bar per option', () => {
    setup()
    expect(screen.getByTestId('mcq-bar-0')).toBeInTheDocument()
    expect(screen.getByTestId('mcq-bar-1')).toBeInTheDocument()
    expect(screen.getByTestId('mcq-bar-2')).toBeInTheDocument()
  })

  it('renders correct relative heights (relative to max count)', () => {
    // counts=[2,5,3], maxCount=5 → heights 40%, 100%, 60%
    setup()
    expect(screen.getByTestId('mcq-bar-0')).toHaveStyle({ height: '40%' })
    expect(screen.getByTestId('mcq-bar-1')).toHaveStyle({ height: '100%' })
    expect(screen.getByTestId('mcq-bar-2')).toHaveStyle({ height: '60%' })
  })

  it('renders option text labels below each bar', () => {
    setup()
    expect(screen.getByTestId('mcq-option-text-0')).toHaveTextContent('Cutting')
    expect(screen.getByTestId('mcq-option-text-1')).toHaveTextContent('Mixing')
    expect(screen.getByTestId('mcq-option-text-2')).toHaveTextContent('Chopping')
  })
})

describe('McqBarChart — correct option styling', () => {
  it('correct option bar has the success colour class', () => {
    // correctIndex=1 → bar-1 is correct
    setup()
    expect(screen.getByTestId('mcq-bar-1')).toHaveClass('bg-ga-green')
  })

  it('incorrect option bars do not have the success colour class', () => {
    setup()
    expect(screen.getByTestId('mcq-bar-0')).not.toHaveClass('bg-ga-green')
    expect(screen.getByTestId('mcq-bar-2')).not.toHaveClass('bg-ga-green')
  })

  it('applies success class to first option when correctIndex is 0', () => {
    setup({ correctIndex: 0 })
    expect(screen.getByTestId('mcq-bar-0')).toHaveClass('bg-ga-green')
    expect(screen.getByTestId('mcq-bar-1')).not.toHaveClass('bg-ga-green')
  })
})

describe('McqBarChart — percentage labels', () => {
  it('shows count and percentage above each bar', () => {
    // counts=[2,5,3], total=10 → 20%, 50%, 30%
    setup()
    expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('2 (20%)')
    expect(screen.getByTestId('mcq-label-1')).toHaveTextContent('5 (50%)')
    expect(screen.getByTestId('mcq-label-2')).toHaveTextContent('3 (30%)')
  })

  it('rounds percentage to nearest integer', () => {
    // counts=[1,2], total=3 → 33%, 67%
    setup({ options: ['A', 'B'], counts: [1, 2], correctIndex: 1, total: 3 })
    expect(screen.getByTestId('mcq-label-0')).toHaveTextContent('1 (33%)')
    expect(screen.getByTestId('mcq-label-1')).toHaveTextContent('2 (67%)')
  })
})

describe('McqBarChart — zero total (empty state)', () => {
  it('renders empty state message when total is zero', () => {
    setup({ counts: [0, 0, 0], total: 0 })
    expect(screen.getByTestId('mcq-chart-empty')).toBeInTheDocument()
    expect(screen.getByTestId('mcq-chart-empty')).toHaveTextContent('No responses yet.')
  })

  it('does not render bar elements when total is zero', () => {
    setup({ counts: [0, 0, 0], total: 0 })
    expect(screen.queryByTestId('mcq-bar-chart')).not.toBeInTheDocument()
  })
})

describe('McqBarChart — accessibility', () => {
  it('has role="img" on the chart container', () => {
    setup()
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('aria-label includes all options with vote counts and percentages', () => {
    // counts=[2,5,3], total=10 → Cutting 2 votes 20%, Mixing 5 votes 50%, Chopping 3 votes 30%
    setup()
    const chart = screen.getByRole('img')
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('Cutting 2 votes 20%'))
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('Mixing 5 votes 50%'))
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('Chopping 3 votes 30%'))
  })

  it('uses singular "vote" for a count of 1', () => {
    setup({ options: ['A', 'B'], counts: [1, 9], correctIndex: 1, total: 10 })
    const chart = screen.getByRole('img')
    expect(chart).toHaveAttribute('aria-label', expect.stringContaining('A 1 vote 10%'))
  })
})
