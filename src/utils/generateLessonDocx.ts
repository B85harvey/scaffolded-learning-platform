/**
 * generateLessonDocx — builds a .docx Blob from the student's assembled lesson.
 *
 * Uses the `docx` package (https://docx.js.org/).
 * Font: Calibri (reliably available in Microsoft Word; Poppins is not).
 * Colour: Gradient Able primary #4680FF for section headings.
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

export interface DocxSection {
  heading: string
  content: string | null
}

export interface GenerateLessonDocxInput {
  lessonTitle: string
  studentName: string
  date: string
  sections: DocxSection[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Gradient Able primary colour (#4680FF) in OOXML hex (no leading #). */
const PRIMARY_COLOUR = '4680FF'

/** Grey for subtitle and empty-content placeholder. */
const MUTED_COLOUR = '6B7280'

/** Page margin: 2.54 cm converted to twips. */
const MARGIN_TWIPS = convertMillimetersToTwip(25.4)

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Generates a .docx file from the given lesson data and returns it as a Blob.
 */
export async function generateLessonDocx(input: GenerateLessonDocxInput): Promise<Blob> {
  const { lessonTitle, studentName, date, sections } = input

  const docChildren: Paragraph[] = []

  // Title paragraph
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: lessonTitle,
          bold: true,
          size: 36, // half-points; 36 = 18pt
          font: 'Calibri',
        }),
      ],
    })
  )

  // Subtitle: student name + date
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240 },
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

  // Sections
  for (const section of sections) {
    // Section heading
    docChildren.push(
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

    // Section body or placeholder
    docChildren.push(
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
        children: docChildren,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  // Convert Node.js Buffer to Uint8Array so it's a valid BlobPart in both
  // browser and Node/jsdom environments.
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
