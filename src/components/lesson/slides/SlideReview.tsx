import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLesson } from '@/contexts/LessonContext'
import { toast } from '@/components/ui/Toast'
import { buildMarkdown, ActionPlanDocument, SECTIONS } from '@/components/lesson/ActionPlanDocument'
import { generateLessonDocx } from '@/utils/generateLessonDocx'
import { triggerDocxDownload } from '@/utils/triggerDownload'
import type { CommittedParagraph } from '@/lessons/types'

// ── Word count helper ─────────────────────────────────────────────────────────

function countWords(paragraphs: Record<string, CommittedParagraph>): number {
  return Object.values(paragraphs)
    .map((p) => p.text.trim().split(/\s+/).filter(Boolean).length)
    .reduce((sum, n) => sum + n, 0)
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'raw' | 'polished'

interface TabListProps {
  activeTab: Tab
  onSelect: (tab: Tab) => void
}

function TabList({ activeTab, onSelect }: TabListProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'raw', label: 'Raw' },
    { id: 'polished', label: 'Polished' },
  ]

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = (index + 1) % tabs.length
      tabRefs.current[next]?.focus()
      onSelect(tabs[next].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = (index - 1 + tabs.length) % tabs.length
      tabRefs.current[prev]?.focus()
      onSelect(tabs[prev].id)
    }
  }

  return (
    <div role="tablist" aria-label="Review format" className="flex gap-1">
      {tabs.map((tab, idx) => (
        <button
          key={tab.id}
          ref={(el) => {
            tabRefs.current[idx] = el
          }}
          role="tab"
          id={`review-tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`review-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          type="button"
          onClick={() => onSelect(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className={cn(
            'rounded-ga-sm px-4 py-2 font-sans text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
            activeTab === tab.id
              ? 'bg-ga-primary text-white'
              : 'text-ga-ink-muted hover:text-ga-ink'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Download menu ─────────────────────────────────────────────────────────────

interface DownloadMenuProps {
  lessonTitle: string
  studentName: string
  committed: Record<string, string | undefined>
}

function DownloadMenu({ lessonTitle, studentName, committed }: DownloadMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const triggerRef = useRef<HTMLButtonElement>(null)

  const items = [
    { id: 'docx', label: 'Download as .docx' },
    { id: 'pdf', label: 'Download as .pdf' },
  ]

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !open) {
      e.preventDefault()
      setOpen(true)
      // Focus first item after open
      setTimeout(() => itemRefs.current[0]?.focus(), 0)
    }
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      setOpen(true)
      setTimeout(() => itemRefs.current[0]?.focus(), 0)
    }
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      itemRefs.current[(index + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      itemRefs.current[(index - 1 + items.length) % items.length]?.focus()
    }
  }

  const handleDocxClick = async () => {
    setOpen(false)
    triggerRef.current?.focus()

    const sections = SECTIONS.map(({ key, label }) => ({
      heading: label,
      content: committed[key] ?? null,
    }))

    const date = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const blob = await generateLessonDocx({ lessonTitle, studentName, date, sections })
    const safeTitle = lessonTitle.replace(/[/\\?%*:|"<>]/g, '-')
    const safeName = studentName.replace(/[/\\?%*:|"<>]/g, '-')
    triggerDocxDownload(blob, `${safeTitle} - ${safeName}.docx`)
  }

  const handlePdfClick = () => {
    toast('Coming soon', { variant: 'info' })
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Download"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'rounded-ga-sm border border-ga-border-strong px-4 py-2 font-sans text-sm font-medium text-ga-ink',
          'transition-colors hover:border-ga-primary hover:text-ga-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2'
        )}
      >
        Download
      </button>

      {open && (
        <menu
          role="menu"
          aria-label="Download options"
          className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-ga-md border border-ga-border-subtle bg-ga-surface py-1 shadow-ga-md"
          onBlur={(e) => {
            // Close when focus leaves the menu entirely
            if (!menuRef.current?.contains(e.relatedTarget as Node)) {
              setOpen(false)
            }
          }}
        >
          {items.map((item, idx) => (
            <li key={item.id} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                role="menuitem"
                type="button"
                onClick={item.id === 'docx' ? () => void handleDocxClick() : handlePdfClick}
                onKeyDown={(e) => handleMenuKeyDown(e, idx)}
                className={cn(
                  'w-full px-4 py-2 text-left font-sans text-sm text-ga-ink',
                  'hover:bg-ga-surface-muted',
                  'focus-visible:bg-ga-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ga-primary/40'
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </menu>
      )}
    </div>
  )
}

// ── SlideReview ───────────────────────────────────────────────────────────────

interface SlideReviewProps {
  lessonTitle: string
  studentName: string
}

export function SlideReview({ lessonTitle, studentName }: SlideReviewProps) {
  const { state, dispatch } = useLesson()
  const activeTab = state.ui.reviewTab

  const wordCount = countWords(state.committed)

  // Flatten committed paragraphs to plain text for ActionPlanDocument and buildMarkdown.
  const committedText: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(state.committed)) {
    committedText[k] = v?.text
  }

  const handleTabSelect = (tab: Tab) => {
    dispatch({ type: 'SET_REVIEW_TAB', tab })
  }

  const handleCopyAll = async () => {
    const markdown = buildMarkdown(committedText)
    try {
      await navigator.clipboard.writeText(markdown)
      toast('Copied to clipboard', { variant: 'success' })
    } catch {
      toast('Copy failed — please try again', { variant: 'default' })
    }
  }

  return (
    <section className="mx-auto w-full max-w-[820px]" aria-label="Review your action plan">
      {/* Word count */}
      <p
        data-testid="word-count"
        className="mb-4 font-sans text-sm text-ga-ink-muted"
        aria-live="polite"
      >
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </p>

      {/* Tab list + actions row */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <TabList activeTab={activeTab} onSelect={handleTabSelect} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Copy all"
            onClick={handleCopyAll}
            className={cn(
              'rounded-ga-sm border border-ga-border-strong px-4 py-2 font-sans text-sm font-medium text-ga-ink',
              'transition-colors hover:border-ga-primary hover:text-ga-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2'
            )}
          >
            Copy All
          </button>
          <DownloadMenu
            lessonTitle={lessonTitle}
            studentName={studentName}
            committed={committedText}
          />
        </div>
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id="review-panel-raw"
        aria-labelledby="review-tab-raw"
        data-testid="review-panel-raw"
        hidden={activeTab !== 'raw'}
      >
        <ActionPlanDocument committed={committedText} polished={false} />
      </div>

      <div
        role="tabpanel"
        id="review-panel-polished"
        aria-labelledby="review-tab-polished"
        hidden={activeTab !== 'polished'}
      >
        <ActionPlanDocument committed={committedText} polished={true} />
      </div>
    </section>
  )
}
