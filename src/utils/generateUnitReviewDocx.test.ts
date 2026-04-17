/**
 * generateUnitReviewDocx unit tests.
 *
 * Verifies: MIME type, non-empty blob, multi-lesson content presence,
 * "[Not started]" for lessons with no sections, and "[Not yet completed]"
 * for lessons with null-content sections. Also verifies an empty lessons
 * array still produces a valid docx.
 */
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { generateUnitReviewDocx } from './generateUnitReviewDocx'
import type { GenerateUnitReviewDocxInput } from './generateUnitReviewDocx'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const INPUT_TWO_LESSONS: GenerateUnitReviewDocxInput = {
  unitTitle: 'Unit 2: Food and Hospitality',
  studentName: 'Alex Smith',
  date: '17 April 2026',
  lessons: [
    {
      lessonTitle: 'Kitchen Technologies',
      sections: [
        {
          heading: 'aim: Statement of intent',
          content: 'The aim is to investigate kitchen technologies.',
        },
        { heading: 'issues: Key issues', content: null },
      ],
    },
    {
      // sections: [] means the student never started this lesson
      lessonTitle: 'Food Safety',
      sections: [],
    },
  ],
}

describe('generateUnitReviewDocx', () => {
  it(
    'returns a non-empty Blob with correct MIME type, and the docx contains ' +
      'unit title, both lesson titles, section content, and [Not started]',
    async () => {
      const blob = await generateUnitReviewDocx(INPUT_TWO_LESSONS)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe(DOCX_MIME)
      expect(blob.size).toBeGreaterThan(0)

      const arrayBuffer = await blob.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)
      const documentXml = await zip.file('word/document.xml')?.async('string')

      expect(documentXml).toBeDefined()
      // Unit title fragments (the colon is XML-safe but let's check both words)
      expect(documentXml).toContain('Unit 2')
      expect(documentXml).toContain('Food and Hospitality')
      // Lesson titles
      expect(documentXml).toContain('Kitchen Technologies')
      expect(documentXml).toContain('Food Safety')
      // Committed content
      expect(documentXml).toContain('The aim is to investigate kitchen technologies')
      // Not-started placeholder (lesson with sections: [])
      expect(documentXml).toContain('[Not started]')
    }
  )

  it('shows [Not yet completed] for null section content', async () => {
    const blob = await generateUnitReviewDocx(INPUT_TWO_LESSONS)

    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    // The "issues: Key issues" section has content: null → placeholder
    expect(documentXml).toContain('[Not yet completed]')
  })

  it('produces a valid docx with just the title and subtitle for an empty lessons array', async () => {
    const blob = await generateUnitReviewDocx({
      unitTitle: 'Unit 2: Food and Hospitality',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      lessons: [],
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe(DOCX_MIME)
    expect(blob.size).toBeGreaterThan(0)

    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Unit 2')
    expect(documentXml).toContain('Alex Smith')
    // No lesson content or placeholders expected
    expect(documentXml).not.toContain('[Not started]')
    expect(documentXml).not.toContain('[Not yet completed]')
  })
})
