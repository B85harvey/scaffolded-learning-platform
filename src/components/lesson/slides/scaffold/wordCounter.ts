/**
 * Counts the number of words in a string.
 * Exported from its own module so that FramedMode.tsx contains only
 * React components (required by the react-refresh/only-export-components rule).
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
