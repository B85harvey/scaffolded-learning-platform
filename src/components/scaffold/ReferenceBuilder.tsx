import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatApa7Citation } from '@/utils/formatApa7Citation'
import type { CitationType } from '@/utils/formatApa7Citation'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReferenceBuilderProps {
  onAdd: (citation: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPreviewCitation(
  type: CitationType,
  plainText: string,
  title: string,
  source: string
): React.ReactNode {
  if (!plainText) return null

  // For journal articles, italicise the journal name (source); otherwise italicise the title.
  const italicTarget = type === 'journal' ? source.trim() : title.trim()

  if (!italicTarget) return plainText

  const idx = plainText.indexOf(italicTarget)
  if (idx === -1) return plainText

  return (
    <>
      {plainText.slice(0, idx)}
      <em>{italicTarget}</em>
      {plainText.slice(idx + italicTarget.length)}
    </>
  )
}

// ── ReferenceBuilder ──────────────────────────────────────────────────────────

export function ReferenceBuilder({ onAdd }: ReferenceBuilderProps) {
  const [type, setType] = useState<CitationType>('website')
  const [authors, setAuthors] = useState('')
  const [year, setYear] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [url, setUrl] = useState('')
  const [volume, setVolume] = useState('')
  const [issue, setIssue] = useState('')
  const [pages, setPages] = useState('')

  const accessedDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  )

  const sourceLabel = type === 'book' ? 'Publisher' : type === 'journal' ? 'Journal Name' : 'Source'

  const citation = formatApa7Citation({
    type,
    authors,
    year,
    title,
    source,
    url,
    volume,
    issue,
    pages,
  })

  const handleAdd = () => {
    if (!citation) return
    onAdd(citation)
    setAuthors('')
    setYear('')
    setTitle('')
    setSource('')
    setUrl('')
    setVolume('')
    setIssue('')
    setPages('')
  }

  const inputClass = cn(
    'w-full rounded-ga-sm border border-ga-border-strong bg-white px-3 py-2 font-sans text-sm text-ga-ink',
    'focus-visible:border-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40'
  )
  const labelClass = 'mb-1 block font-sans text-xs font-medium text-ga-ink-muted'

  return (
    <div
      data-testid="reference-builder"
      className="rounded-ga-md border border-ga-border-subtle bg-ga-surface-muted p-4"
    >
      <p className="mb-4 font-sans text-sm font-medium text-ga-ink">Add a reference</p>

      <div className="flex flex-col gap-3">
        {/* Type */}
        <div>
          <label htmlFor="ref-type" className={labelClass}>
            Type
          </label>
          <select
            id="ref-type"
            value={type}
            onChange={(e) => setType(e.target.value as CitationType)}
            className={inputClass}
          >
            <option value="website">Website</option>
            <option value="book">Book</option>
            <option value="journal">Journal article</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Authors */}
        <div>
          <label htmlFor="ref-authors" className={labelClass}>
            Author(s)
          </label>
          <input
            id="ref-authors"
            type="text"
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
            placeholder="e.g. Smith, J., & Jones, A."
            className={inputClass}
          />
        </div>

        {/* Year */}
        <div>
          <label htmlFor="ref-year" className={labelClass}>
            Year
          </label>
          <input
            id="ref-year"
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value.slice(0, 4))}
            placeholder="e.g. 2023"
            maxLength={4}
            className={inputClass}
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="ref-title" className={labelClass}>
            Title
          </label>
          <input
            id="ref-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of the work"
            className={inputClass}
          />
        </div>

        {/* Source / Publisher / Journal Name */}
        <div>
          <label htmlFor="ref-source" className={labelClass}>
            {sourceLabel}
          </label>
          <input
            id="ref-source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={sourceLabel}
            className={inputClass}
          />
        </div>

        {/* URL — Website and Other only */}
        {(type === 'website' || type === 'other') && (
          <div>
            <label htmlFor="ref-url" className={labelClass}>
              URL
            </label>
            <input
              id="ref-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </div>
        )}

        {/* Journal-specific fields */}
        {type === 'journal' && (
          <>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="ref-volume" className={labelClass}>
                  Volume
                </label>
                <input
                  id="ref-volume"
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="e.g. 45"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="ref-issue" className={labelClass}>
                  Issue
                </label>
                <input
                  id="ref-issue"
                  type="text"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="e.g. 3"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="ref-pages" className={labelClass}>
                Pages
              </label>
              <input
                id="ref-pages"
                type="text"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                placeholder="e.g. 112–118"
                className={inputClass}
              />
            </div>
          </>
        )}

        {/* Accessed date — Website only, read-only */}
        {type === 'website' && (
          <div>
            <label htmlFor="ref-accessed" className={labelClass}>
              Accessed
            </label>
            <input
              id="ref-accessed"
              type="text"
              value={accessedDate}
              readOnly
              className={cn(inputClass, 'bg-ga-surface-muted text-ga-ink-muted')}
            />
          </div>
        )}
      </div>

      {/* Live preview */}
      {citation && (
        <p
          data-testid="citation-preview"
          className="mt-4 rounded-ga-sm border border-ga-border-subtle bg-white px-3 py-2 font-sans text-sm text-ga-ink"
        >
          {renderPreviewCitation(type, citation, title, source)}
        </p>
      )}

      {/* Add button */}
      <div className="mt-4">
        <button
          type="button"
          data-testid="add-reference-btn"
          disabled={!citation}
          onClick={handleAdd}
          className={cn(
            'rounded-ga-sm border border-ga-border-strong px-4 py-2 font-sans text-sm font-medium text-ga-ink',
            'transition-colors hover:border-ga-primary hover:text-ga-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          Add Reference
        </button>
      </div>
    </div>
  )
}
