export type CitationType = 'website' | 'book' | 'journal' | 'other'

export interface ApaFields {
  type: CitationType
  authors: string
  year: string
  title: string
  source: string
  url: string
  volume: string
  issue: string
  pages: string
}

export function formatApa7Citation(fields: ApaFields): string {
  const year = fields.year.trim() || 'n.d.'
  const authors = fields.authors.trim()
  const title = fields.title.trim()
  const source = fields.source.trim()

  if (!title && !authors) return ''

  const hasAuthor = authors.length > 0
  const opening = hasAuthor ? `${authors} (${year}).` : `${title} (${year}).`
  const titlePart = hasAuthor && title ? `${title}.` : null

  switch (fields.type) {
    case 'website': {
      const url = fields.url.trim()
      return [opening, titlePart, source ? `${source}.` : null, url || null]
        .filter(Boolean)
        .join(' ')
    }
    case 'book':
      return [opening, titlePart, source ? `${source}.` : null].filter(Boolean).join(' ')
    case 'journal': {
      const volume = fields.volume.trim()
      const issue = fields.issue.trim()
      const pages = fields.pages.trim()
      let sourcePart: string | null = null
      if (source) {
        sourcePart = source
        if (volume) {
          sourcePart += `, ${volume}`
          if (issue) sourcePart += `(${issue})`
        }
        if (pages) sourcePart += `, ${pages}`
        sourcePart += '.'
      }
      return [opening, titlePart, sourcePart].filter(Boolean).join(' ')
    }
    case 'other':
      return [opening, titlePart, source ? `${source}.` : null].filter(Boolean).join(' ')
    default:
      return ''
  }
}
