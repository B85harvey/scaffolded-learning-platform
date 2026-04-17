/**
 * generateLessonCsv — builds a CSV string from class scaffold responses.
 *
 * Column 1: "Student Name"
 * Columns 2+: one per scaffoldColumn entry, using the label as the header.
 * All cell values are wrapped in double quotes; internal double-quotes are
 * escaped as "" per RFC 4180.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CsvStudent {
  name: string
  /** Keyed by slideId — empty string for uncommitted slides. */
  responses: Record<string, string>
}

export interface CsvColumn {
  slideId: string
  /** Human-readable header, e.g. "Aim: Statement of intent" */
  label: string
}

export interface GenerateLessonCsvInput {
  lessonTitle: string
  students: CsvStudent[]
  scaffoldColumns: CsvColumn[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps a value in double quotes and escapes any internal double-quotes. */
function quoteCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Returns a CSV string. Handles an empty scaffoldColumns array gracefully
 * (returns a header row with only "Student Name" followed by student rows).
 */
export function generateLessonCsv(input: GenerateLessonCsvInput): string {
  const { students, scaffoldColumns } = input

  const rows: string[] = []

  // Header row
  const headerCells = [
    quoteCsvCell('Student Name'),
    ...scaffoldColumns.map((c) => quoteCsvCell(c.label)),
  ]
  rows.push(headerCells.join(','))

  // One row per student
  for (const student of students) {
    const cells = [
      quoteCsvCell(student.name),
      ...scaffoldColumns.map((c) => quoteCsvCell(student.responses[c.slideId] ?? '')),
    ]
    rows.push(cells.join(','))
  }

  return rows.join('\n')
}
