/**
 * Minimal markdown renderer covering the subset used in lesson slides:
 * paragraphs, ordered lists, unordered lists, bold (**text**), italic (*text*).
 *
 * Not a general-purpose CommonMark parser. Adding block-level headings,
 * tables, or code blocks is out of scope for Phase 2 lessons.
 */

type InlineToken =
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'text'; text: string }

function parseInline(raw: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let remaining = raw

  while (remaining.length > 0) {
    const bold = remaining.match(/^\*\*([^*]+)\*\*/)
    if (bold) {
      tokens.push({ kind: 'bold', text: bold[1] })
      remaining = remaining.slice(bold[0].length)
      continue
    }

    const italic = remaining.match(/^\*([^*]+)\*/)
    if (italic) {
      tokens.push({ kind: 'italic', text: italic[1] })
      remaining = remaining.slice(italic[0].length)
      continue
    }

    const plain = remaining.match(/^[^*]+/)
    if (plain) {
      tokens.push({ kind: 'text', text: plain[0] })
      remaining = remaining.slice(plain[0].length)
      continue
    }

    // Lone asterisk — output literally
    tokens.push({ kind: 'text', text: remaining[0] })
    remaining = remaining.slice(1)
  }

  return tokens
}

function Inline({ text }: { text: string }) {
  const tokens = parseInline(text)
  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === 'bold') return <strong key={i}>{token.text}</strong>
        if (token.kind === 'italic') return <em key={i}>{token.text}</em>
        return token.text
      })}
    </>
  )
}

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'ordered-list'; items: string[] }
  | { kind: 'unordered-list'; items: string[] }

function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ordered-list', items })
      continue
    }

    // Unordered list (- or *)
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'unordered-list', items })
      continue
    }

    // Paragraph — accumulate until blank line or list
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*]\s/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ kind: 'paragraph', lines: paraLines })
    }
  }

  return blocks
}

interface MarkdownBodyProps {
  children: string
  className?: string
}

export function MarkdownBody({ children, className = '' }: MarkdownBodyProps) {
  const blocks = parseBlocks(children)

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.kind === 'paragraph') {
          return (
            <p key={i} className="mb-4 leading-relaxed last:mb-0">
              <Inline text={block.lines.join(' ')} />
            </p>
          )
        }

        if (block.kind === 'ordered-list') {
          return (
            <ol key={i} className="mb-4 list-decimal space-y-1 pl-6 last:mb-0">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ol>
          )
        }

        if (block.kind === 'unordered-list') {
          return (
            <ul key={i} className="mb-4 list-disc space-y-1 pl-6 last:mb-0">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          )
        }

        return null
      })}
    </div>
  )
}
