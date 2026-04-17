/**
 * generateLessonDocx unit tests.
 *
 * Verifies: output type, non-empty blob, presence of lesson title,
 * and the "[Not yet completed]" placeholder for null/empty sections.
 */
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { generateLessonDocx } from './generateLessonDocx'
import type { DocxSection } from './generateLessonDocx'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const THREE_SECTIONS: DocxSection[] = [
  { heading: 'Aim', content: 'To investigate kitchen technologies in the classroom.' },
  { heading: 'Issues', content: null },
  { heading: 'Decision', content: '' },
]

describe('generateLessonDocx', () => {
  it('returns a Blob with the correct MIME type', async () => {
    const blob = await generateLessonDocx({
      lessonTitle: 'Kitchen Technologies',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      sections: THREE_SECTIONS,
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe(DOCX_MIME)
  })

  it('returns a non-empty Blob', async () => {
    const blob = await generateLessonDocx({
      lessonTitle: 'Kitchen Technologies',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      sections: THREE_SECTIONS,
    })

    expect(blob.size).toBeGreaterThan(0)
  })

  it('docx archive contains the lesson title text', async () => {
    const blob = await generateLessonDocx({
      lessonTitle: 'Kitchen Technologies',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      sections: THREE_SECTIONS,
    })

    // A .docx file is a zip containing word/document.xml.
    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toBeDefined()
    expect(documentXml).toContain('Kitchen Technologies')
  })

  it('docx archive contains "[Not yet completed]" for null content', async () => {
    const blob = await generateLessonDocx({
      lessonTitle: 'Kitchen Technologies',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      sections: THREE_SECTIONS,
    })

    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    // Both null and empty-string sections should render the placeholder.
    expect(documentXml).toContain('[Not yet completed]')
  })

  it('docx archive contains the student name', async () => {
    const blob = await generateLessonDocx({
      lessonTitle: 'Kitchen Technologies',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      sections: THREE_SECTIONS,
    })

    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toContain('Alex Smith')
  })

  it('docx archive contains section content for non-null, non-empty sections', async () => {
    const blob = await generateLessonDocx({
      lessonTitle: 'Kitchen Technologies',
      studentName: 'Alex Smith',
      date: '17 April 2026',
      sections: THREE_SECTIONS,
    })

    const arrayBuffer = await blob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    expect(documentXml).toContain('To investigate kitchen technologies in the classroom.')
  })
})
