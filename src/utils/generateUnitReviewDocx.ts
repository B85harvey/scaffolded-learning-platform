/**
 * generateUnitReviewDocx — builds a multi-lesson Unit Review .docx Blob.
 *
 * Document structure:
 *   - Title: unit title, bold, 18pt, Calibri
 *   - Subtitle: student name · date, 11pt, grey
 *   - For each lesson:
 *     - Lesson heading, 16pt bold, with spacing above to visually separate
 *     - If lesson has no submissions: "[Not started]" in grey italic
 *     - Otherwise: section headings (14pt bold, #4680FF) + body text (11pt)
 *       or "[Not yet completed]" in grey italic for empty sections
 *   - Page margins: 2.54 cm all sides
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertMillimetersToTwip,
} from 'docx'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UnitReviewSection {
  heading: string
  content: string | null
}

export interface UnitReviewLesson {
  lessonTitle: string
  /** Empty array means the lesson was not started at all. */
  sections: UnitReviewSection[]
}

export interface GenerateUnitReviewDocxInput {
  unitTitle: string
  studentName: string
  date: string
  lessons: UnitReviewLesson[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIMARY_COLOUR = '4680FF'
const MUTED_COLOUR = '6B7280'
const MARGIN_TWIPS = convertMillimetersToTwip(25.4)

// ── Builder ───────────────────────────────────────────────────────────────────

export async function generateUnitReviewDocx(input: GenerateUnitReviewDocxInput): Promise<Blob> {
  const { unitTitle, studentName, date, lessons } = input

  const children: Paragraph[] = []

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: unitTitle,
          bold: true,
          size: 36, // half-points → 18pt
          font: 'Calibri',
        }),
      ],
    })
  )

  // Subtitle
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `${studentName}  ·  ${date}`,
          size: 22, // 11pt
          color: MUTED_COLOUR,
          font: 'Calibri',
        }),
      ],
    })
  )

  // Lessons
  for (const lesson of lessons) {
    // Lesson heading with extra space above to separate lessons visually
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 160 },
        children: [
          new TextRun({
            text: lesson.lessonTitle,
            bold: true,
            size: 32, // 16pt
            font: 'Calibri',
          }),
        ],
      })
    )

    if (lesson.sections.length === 0) {
      // Lesson not started
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: '[Not started]',
              size: 22,
              color: MUTED_COLOUR,
              italics: true,
              font: 'Calibri',
            }),
          ],
        })
      )
      continue
    }

    for (const section of lesson.sections) {
      // Section heading
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: section.heading,
              bold: true,
              size: 28, // 14pt
              color: PRIMARY_COLOUR,
              font: 'Calibri',
            }),
          ],
        })
      )

      const hasContent = section.content !== null && section.content !== ''

      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: hasContent ? section.content! : '[Not yet completed]',
              size: 22, // 11pt
              font: 'Calibri',
              color: hasContent ? undefined : MUTED_COLOUR,
              italics: !hasContent,
            }),
          ],
        })
      )
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN_TWIPS,
              right: MARGIN_TWIPS,
              bottom: MARGIN_TWIPS,
              left: MARGIN_TWIPS,
            },
          },
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
