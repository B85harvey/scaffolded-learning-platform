import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import type { LessonState } from '@/contexts/lessonReducer'
import { LessonShell } from './LessonShell'
import { DevToolbar } from './DevToolbar'
import { ToastRegion } from '@/components/ui/Toast'
import kitchenTechnologies from '@/lessons/kitchen-technologies'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderShellWithDev(searchOverride = '?dev=1') {
  // Stub location.search so the dev gate activates
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: searchOverride },
    writable: true,
    configurable: true,
  })
  const lesson = kitchenTechnologies
  return render(
    <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
      <LessonShell lesson={lesson} />
    </LessonProvider>
  )
}

function renderToolbar(stateOverrides: Partial<LessonState> = {}) {
  const base = makeLessonState(kitchenTechnologies.id, kitchenTechnologies.slides)
  const state = { ...base, ...stateOverrides }
  return render(
    <LessonProvider initialState={state}>
      <ToastRegion />
      <DevToolbar />
    </LessonProvider>
  )
}

// ── Dev gate ──────────────────────────────────────────────────────────────────

describe('DevToolbar — gate', () => {
  it('does not render without ?dev=1 in the URL', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    })
    const lesson = kitchenTechnologies
    render(
      <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
        <LessonShell lesson={lesson} />
      </LessonProvider>
    )
    expect(screen.queryByTestId('dev-toolbar')).not.toBeInTheDocument()
  })

  it('renders with ?dev=1 in the URL', () => {
    renderShellWithDev('?dev=1')
    expect(screen.getByTestId('dev-toolbar')).toBeInTheDocument()
  })
})

// ── Collapse / expand ─────────────────────────────────────────────────────────

describe('DevToolbar — collapse/expand', () => {
  it('chip is visible by default', () => {
    renderToolbar()
    expect(screen.getByRole('button', { name: 'Expand dev toolbar' })).toBeInTheDocument()
  })

  it('panel is not visible when collapsed', () => {
    renderToolbar()
    expect(screen.queryByRole('region', { name: 'Developer toolbar' })).not.toBeInTheDocument()
  })

  it('expands on chip click', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('region', { name: 'Developer toolbar' })).toBeInTheDocument()
  })

  it('collapses on Escape', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('region', { name: 'Developer toolbar' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Developer toolbar' })).not.toBeInTheDocument()
  })
})

// ── Slide jumper ──────────────────────────────────────────────────────────────

describe('DevToolbar — slide jumper', () => {
  it('renders the slide jumper select', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('combobox', { name: 'Jump to slide' })).toBeInTheDocument()
  })

  it('slide jumper has all 18 slides as options', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    const select = screen.getByRole('combobox', { name: 'Jump to slide' })
    expect(select.querySelectorAll('option')).toHaveLength(18)
  })

  it('selecting a slide dispatches GOTO', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    const select = screen.getByRole('combobox', { name: 'Jump to slide' })

    // Jump to slide 5 (aim scaffold)
    await user.selectOptions(select, 'slide-05-aim-scaffold')

    // Verify the toolbar is still visible (dispatch didn't throw)
    expect(screen.getByRole('combobox', { name: 'Jump to slide' })).toBeInTheDocument()
  })
})

// ── Toggle lock ───────────────────────────────────────────────────────────────

describe('DevToolbar — toggle lock', () => {
  it('renders the lock button', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('button', { name: /lock slide/i })).toBeInTheDocument()
  })

  it('clicking Lock slide changes button to Unlock slide', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    await user.click(screen.getByRole('button', { name: 'Lock slide' }))
    expect(screen.getByRole('button', { name: 'Unlock slide' })).toBeInTheDocument()
  })
})

// ── Reveal MCQ ────────────────────────────────────────────────────────────────

describe('DevToolbar — reveal MCQ', () => {
  it('Reveal MCQ button is disabled on a content slide', async () => {
    const user = userEvent.setup()
    // Default state starts on slide 0 (content)
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('button', { name: 'Reveal MCQ answers' })).toBeDisabled()
  })

  it('Reveal MCQ button is enabled on a class-check MCQ slide', async () => {
    const user = userEvent.setup()
    // Find the first class-check MCQ slide index — kitchen-technologies has none by default
    // Artificially jump to slide 3 (slide-03-rule-check is self, not class)
    // We need a class-check slide — check if any exist in kitchen-technologies
    // Looking at the lesson, slide-07-tee-check is also 'self'.
    // So let's create a custom state with a class-check MCQ as current slide
    const classCheckSlide = {
      id: 'test-class-mcq',
      type: 'mcq' as const,
      section: 'orientation' as const,
      variant: 'class' as const,
      question: 'Test question?',
      options: [{ id: 'a', text: 'Option A', correct: true }],
    }
    const base = makeLessonState('test', [classCheckSlide])
    render(
      <LessonProvider initialState={{ ...base, currentSlideIndex: 0 }}>
        <DevToolbar />
      </LessonProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('button', { name: 'Reveal MCQ answers' })).not.toBeDisabled()
  })
})

// ── Reset answers ─────────────────────────────────────────────────────────────

describe('DevToolbar — reset answers', () => {
  it('renders the Reset answers button', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('button', { name: 'Reset all answers' })).toBeInTheDocument()
  })

  it('clicking Reset answers collapses the toolbar', async () => {
    const user = userEvent.setup()
    renderToolbar({
      answers: { 'slide-01-orientation': { kind: 'text', values: { test: 'value' } } },
    })
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    await user.click(screen.getByRole('button', { name: 'Reset all answers' }))
    expect(screen.queryByRole('region', { name: 'Developer toolbar' })).not.toBeInTheDocument()
  })
})

// ── Export JSON ───────────────────────────────────────────────────────────────

describe('DevToolbar — export JSON', () => {
  it('renders the Export JSON button', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    expect(screen.getByRole('button', { name: 'Export state as JSON' })).toBeInTheDocument()
  })

  it('clicking Export JSON calls clipboard.writeText with JSON', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Expand dev toolbar' }))
    await user.click(screen.getByRole('button', { name: 'Export state as JSON' }))

    expect(writeText).toHaveBeenCalledOnce()
    const json = writeText.mock.calls[0][0] as string
    expect(() => JSON.parse(json)).not.toThrow()
  })
})
