/**
 * Sanitises a raw answer string before assembly.
 *
 * - Trims leading and trailing whitespace.
 * - Collapses runs of internal whitespace (including newlines) to a single space.
 * - Normalises curly/typographic quotes to straight ASCII equivalents.
 */
export function sanitiseAnswer(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'") // left/right single quotation marks → apostrophe
    .replace(/[\u201C\u201D]/g, '"') // left/right double quotation marks → straight double
    .replace(/\s+/g, ' ')
    .trim()
}
