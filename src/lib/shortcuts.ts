export interface Shortcut {
  key: string
  description: string
}

/**
 * Single source of truth for every keyboard shortcut in the lesson player.
 * Rendered in ShortcutHelpDialog and used to verify test coverage.
 */
export const SHORTCUTS: Shortcut[] = [
  { key: '→', description: 'Next slide (when unlocked)' },
  { key: '←', description: 'Previous slide' },
  { key: '?', description: 'Open this help dialog' },
  { key: 'Escape', description: 'Close this dialog' },
  { key: '1 – 6', description: 'Select an MCQ option' },
  { key: 'Enter', description: 'Select and submit a focused MCQ option' },
  { key: 'Cmd+Enter', description: 'Submit answer / commit scaffold section' },
]
