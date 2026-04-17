/**
 * generateLessonCsv unit tests.
 *
 * Verifies: correct headers, correct row count, proper quoting of values
 * containing commas and newlines, empty responses, and empty column arrays.
 */
import { describe, it, expect } from 'vitest'
import { generateLessonCsv } from './generateLessonCsv'
import type { CsvColumn, CsvStudent } from './generateLessonCsv'

const COLUMNS: CsvColumn[] = [
  { slideId: 'slide-aim', label: 'Aim: Statement of intent' },
  { slideId: 'slide-issues', label: 'Issues: Key problems identified' },
  { slideId: 'slide-decision', label: 'Decision: Chosen approach' },
]

// Fixture without embedded newlines — used for line-count and structural tests.
const STUDENTS: CsvStudent[] = [
  {
    name: 'Alex Smith',
    responses: {
      'slide-aim': 'The aim is to investigate kitchen technologies.',
      'slide-issues': 'There are several key issues including cost, and time.',
      'slide-decision': 'We decided to focus on induction cooking.',
    },
  },
  {
    name: 'Jordan Lee',
    responses: {
      'slide-aim': 'To explore modern cooking methods.',
      'slide-issues': 'Issues around cost and efficiency.',
      'slide-decision': '',
    },
  },
]

// Fixture with embedded newlines — for quoting tests only.
const STUDENTS_WITH_NEWLINES: CsvStudent[] = [
  {
    name: 'Jordan Lee',
    responses: {
      'slide-aim': 'To explore modern cooking methods.',
      'slide-issues': 'Key issues\ninclude safety\nand reliability.',
      'slide-decision': '',
    },
  },
]

describe('generateLessonCsv', () => {
  it('returns four lines for two students (header + 2 rows)', () => {
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: STUDENTS,
      scaffoldColumns: COLUMNS,
    })
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3) // header + 2 students
  })

  it('first line contains correct column headers', () => {
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: STUDENTS,
      scaffoldColumns: COLUMNS,
    })
    const [header] = csv.split('\n')
    expect(header).toContain('"Student Name"')
    expect(header).toContain('"Aim: Statement of intent"')
    expect(header).toContain('"Issues: Key problems identified"')
    expect(header).toContain('"Decision: Chosen approach"')
  })

  it('correctly quotes a cell value containing a comma', () => {
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: STUDENTS,
      scaffoldColumns: COLUMNS,
    })
    // "There are several key issues including cost, and time." contains a comma
    expect(csv).toContain('"There are several key issues including cost, and time."')
  })

  it('correctly quotes a cell value containing a newline', () => {
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: STUDENTS_WITH_NEWLINES,
      scaffoldColumns: COLUMNS,
    })
    // Jordan's issues response contains newlines — the cell must still be one quoted field
    expect(csv).toContain('"Key issues\ninclude safety\nand reliability."')
  })

  it('renders an empty string for uncommitted slides', () => {
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: STUDENTS,
      scaffoldColumns: COLUMNS,
    })
    // Jordan's decision response is '' — should appear as ""
    // The csv has no embedded newlines in STUDENTS fixture, so splitting is safe.
    const lines = csv.split('\n')
    const jordanRow = lines[2]
    expect(jordanRow).toContain('""')
  })

  it('handles a student with no submissions — all response cells are empty', () => {
    const emptyStudent: CsvStudent = { name: 'Sam Nguyen', responses: {} }
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: [emptyStudent],
      scaffoldColumns: COLUMNS,
    })
    const lines = csv.split('\n')
    const studentRow = lines[1]
    // 3 empty cells + student name = 4 cells total
    expect(studentRow).toBe('"Sam Nguyen","","",""')
  })

  it('handles an empty scaffoldColumns array gracefully', () => {
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: STUDENTS,
      scaffoldColumns: [],
    })
    const lines = csv.split('\n')
    // Header row: just "Student Name"
    expect(lines[0]).toBe('"Student Name"')
    // Two student rows with just their names
    expect(lines[1]).toBe('"Alex Smith"')
    expect(lines[2]).toBe('"Jordan Lee"')
  })

  it('escapes double-quotes inside cell values as ""', () => {
    const studentWithQuote: CsvStudent = {
      name: 'Alex "The Cook" Smith',
      responses: { 'slide-aim': 'Used a "chef\'s knife" to demonstrate.' },
    }
    const csv = generateLessonCsv({
      lessonTitle: 'Kitchen Technologies',
      students: [studentWithQuote],
      scaffoldColumns: [{ slideId: 'slide-aim', label: 'Aim: Statement of intent' }],
    })
    expect(csv).toContain('"Alex ""The Cook"" Smith"')
    expect(csv).toContain('"Used a ""chef\'s knife"" to demonstrate."')
  })
})
