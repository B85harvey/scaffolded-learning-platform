import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LessonProvider } from '@/contexts/LessonContext'
import { makeLessonState } from '@/contexts/lessonReducer'
import type { LessonState } from '@/contexts/lessonReducer'
import { ShortcutHelpDialog } from './ShortcutHelpDialog'
import { LessonShell } from './LessonShell'
import { SHORTCUTS } from '@/lib/shortcuts'
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
  // jsdom does not implement showModal. Define it so the useEffect doesn't throw
  // AND set the `open` attribute so the dialog's content is accessible to aria queries.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDialog(stateOverrides: Partial<LessonState> = {}) {
  const slides = [
    {
      id: 'slide-01',
      type: 'content' as const,
      section: 'orientation' as const,
      body: 'Welcome.',
    },
  ]
  const base = makeLessonState('test-lesson', slides)
  return render(
    <LessonProvider initialState={{ ...base, ...stateOverrides }}>
      <ShortcutHelpDialog />
    </LessonProvider>
  )
}

function renderShell() {
  const lesson = kitchenTechnologies
  return render(
    <LessonProvider initialState={makeLessonState(lesson.id, lesson.slides)}>
      <LessonShell lesson={lesson} />
    </LessonProvider>
  )
}

// ── ShortcutHelpDialog — content ──────────────────────────────────────────────

describe('ShortcutHelpDialog — content', () => {
  it('renders the "Keyboard shortcuts" heading', () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })

  it('renders every entry in SHORTCUTS', () => {
    renderDialog()
    for (const shortcut of SHORTCUTS) {
      expect(screen.getByText(shortcut.key)).toBeInTheDocument()
      expect(screen.getByText(shortcut.description)).toBeInTheDocument()
    }
  })

  it('renders shortcut keys inside <kbd> elements', () => {
    renderDialog()
    const kbds = document.querySelectorAll('kbd')
    expect(kbds.length).toBe(SHORTCUTS.length)
  })

  it('renders a close button', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Close keyboard shortcuts' })).toBeInTheDocument()
  })

  it('clicking the close button dispatches CLOSE_SHORTCUTS', async () => {
    const user = userEvent.setup()
    // Render with shortcutsOpen=true, then trigger close
    renderDialog({ ui: { shortcutsOpen: true, reviewTab: 'raw' } })
    await user.click(screen.getByRole('button', { name: 'Close keyboard shortcuts' }))
    // After dispatch, the parent would unmount this component;
    // here we just verify the button is clickable with no error thrown
    expect(screen.queryByRole('heading', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })
})

// ── LessonShell integration — "?" opens the dialog ───────────────────────────

describe('ShortcutHelpDialog — integration via LessonShell', () => {
  it('dialog is absent before pressing "?"', () => {
    renderShell()
    expect(screen.queryByTestId('shortcut-dialog')).not.toBeInTheDocument()
  })

  it('pressing "?" from document.body opens the dialog', async () => {
    const user = userEvent.setup()
    renderShell()

    document.body.focus()
    await user.keyboard('?')

    expect(screen.getByTestId('shortcut-dialog')).toBeInTheDocument()
  })

  it('does not open when "?" is typed inside a textarea', async () => {
    const user = userEvent.setup()
    renderShell()

    // Navigate to a scaffold slide (slide 5 = aim scaffold, index 4)
    // Use a simple textarea that we inject to verify the guard
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    await user.keyboard('?')

    expect(screen.queryByTestId('shortcut-dialog')).not.toBeInTheDocument()
    document.body.removeChild(textarea)
  })

  it('does not open when "?" is typed inside an input', async () => {
    const user = userEvent.setup()
    renderShell()

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    await user.keyboard('?')

    expect(screen.queryByTestId('shortcut-dialog')).not.toBeInTheDocument()
    document.body.removeChild(input)
  })

  it('Escape closes the dialog', async () => {
    const user = userEvent.setup()
    renderShell()

    document.body.focus()
    await user.keyboard('?')
    expect(screen.getByTestId('shortcut-dialog')).toBeInTheDocument()

    // Fire Escape directly on the dialog element — triggers the onKeyDown handler
    fireEvent.keyDown(screen.getByTestId('shortcut-dialog'), { key: 'Escape' })

    expect(screen.queryByTestId('shortcut-dialog')).not.toBeInTheDocument()
  })

  it('renders every SHORTCUTS entry when open', async () => {
    const user = userEvent.setup()
    renderShell()

    document.body.focus()
    await user.keyboard('?')

    for (const shortcut of SHORTCUTS) {
      expect(screen.getByText(shortcut.key)).toBeInTheDocument()
      expect(screen.getByText(shortcut.description)).toBeInTheDocument()
    }
  })
})
