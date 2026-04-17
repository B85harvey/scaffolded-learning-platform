/**
 * SlidePreview tests.
 *
 * Verifies each slide type renders the correct preview content.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlidePreview } from './SlidePreview'
import type { ContentConfig } from './editors/ContentSlideEditor'
import type { McqConfig } from './editors/McqSlideEditor'
import type { ScaffoldSlideConfig } from './editors/ScaffoldSlideEditor'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SlidePreview — content', () => {
  it('renders content body text', () => {
    const config: ContentConfig = {
      id: 'c1',
      type: 'content',
      section: 'orientation',
      body: 'Hello world this is preview text',
    }
    render(
      <SlidePreview slideType="content" config={config as unknown as Record<string, unknown>} />
    )
    expect(screen.getByText('Hello world this is preview text')).toBeInTheDocument()
  })

  it('renders content title when set', () => {
    const config: ContentConfig = {
      id: 'c1',
      type: 'content',
      section: 'orientation',
      title: 'My Title',
      body: '',
    }
    render(
      <SlidePreview slideType="content" config={config as unknown as Record<string, unknown>} />
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })
})

describe('SlidePreview — mcq', () => {
  it('renders MCQ question', () => {
    const config: McqConfig = {
      id: 'm1',
      type: 'mcq',
      section: 'orientation',
      question: 'Which tool is used to chop?',
      options: [
        { id: 'a', text: 'Knife', correct: true },
        { id: 'b', text: 'Spoon', correct: false },
      ],
      variant: 'self',
    }
    render(<SlidePreview slideType="mcq" config={config as unknown as Record<string, unknown>} />)
    expect(screen.getByText('Which tool is used to chop?')).toBeInTheDocument()
  })

  it('renders MCQ options', () => {
    const config: McqConfig = {
      id: 'm1',
      type: 'mcq',
      section: 'orientation',
      question: 'Q?',
      options: [
        { id: 'a', text: 'Option A', correct: false },
        { id: 'b', text: 'Option B', correct: true },
      ],
      variant: 'self',
    }
    render(<SlidePreview slideType="mcq" config={config as unknown as Record<string, unknown>} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })
})

describe('SlidePreview — scaffold (framed)', () => {
  it('renders scaffold preview container', () => {
    const config: ScaffoldSlideConfig = {
      id: 's1',
      type: 'scaffold',
      section: 'aim',
      mode: 'framed',
      config: {
        targetQuestion: 'What is the aim?',
        prompts: [
          { id: 'p1', text: 'Answer 1', frame: 'The aim is {answer} because', hint: '' },
          { id: 'p2', text: 'Answer 2', frame: 'Furthermore {answer}.', hint: '' },
        ],
      },
    }
    render(
      <SlidePreview slideType="scaffold" config={config as unknown as Record<string, unknown>} />
    )
    expect(screen.getByTestId('slide-preview')).toBeInTheDocument()
    expect(screen.getByTestId('preview-prompt-0')).toBeInTheDocument()
    expect(screen.getByTestId('preview-prompt-1')).toBeInTheDocument()
  })

  it('shows target question in scaffold preview', () => {
    const config: ScaffoldSlideConfig = {
      id: 's1',
      type: 'scaffold',
      section: 'aim',
      mode: 'guided',
      config: {
        targetQuestion: 'What is the purpose?',
        prompts: [{ id: 'p1', text: 'P1', hint: '' }],
      },
    }
    render(
      <SlidePreview slideType="scaffold" config={config as unknown as Record<string, unknown>} />
    )
    expect(screen.getByText('What is the purpose?')).toBeInTheDocument()
  })

  it('renders freeform-table preview with columns', () => {
    const config: ScaffoldSlideConfig = {
      id: 's1',
      type: 'scaffold',
      section: 'implementation',
      mode: 'freeform-table',
      config: {
        template: {
          columns: [
            { id: 'c1', label: 'Week' },
            { id: 'c2', label: 'Activity' },
          ],
          minRows: 3,
        },
      },
    }
    render(
      <SlidePreview slideType="scaffold" config={config as unknown as Record<string, unknown>} />
    )
    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
  })
})

describe('SlidePreview — review', () => {
  it('shows review placeholder text', () => {
    render(<SlidePreview slideType="review" config={{}} />)
    expect(screen.getByText(/review slides are auto-generated/i)).toBeInTheDocument()
  })
})
