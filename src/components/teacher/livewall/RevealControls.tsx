/**
 * RevealControls — stateful reveal / pin / hide manager for the Live Wall.
 *
 * Manages which group cards are revealed, pinned, or hidden.
 * Resets reveal state whenever `selectedSlideId` changes.
 *
 * Card ordering:
 *   - Pinned cards appear first in pin order.
 *   - Unpinned cards follow in their original group order.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResponseCard } from './ResponseCard'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupCard {
  groupId: string
  groupName: string
  /** null = no committed submission yet */
  paragraph: string | null
}

interface Props {
  cards: GroupCard[]
  theme: 'dark' | 'light'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RevealControls({ cards, theme }: Props) {
  const isDark = theme === 'dark'
  const reducedMotion = useReducedMotion()

  // ── Reveal state ─────────────────────────────────────────────────────────────
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [justRevealedIds, setJustRevealedIds] = useState<Set<string>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)

  // Track glow timeouts so we can clear them on unmount.
  const glowTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Note: slide-change reset is handled by the parent rendering RevealControls
  // with key={selectedSlide.slideId}. When the slide changes, React unmounts
  // this component and mounts a fresh instance, so all state is reset for free.

  // Clean up glow timers on unmount.
  useEffect(() => {
    const timers = glowTimers.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  // ── Reveal helpers ────────────────────────────────────────────────────────────

  const reveal = useCallback(
    (groupId: string) => {
      setRevealedIds((prev) => new Set(prev).add(groupId))

      if (!reducedMotion) {
        setJustRevealedIds((prev) => new Set(prev).add(groupId))
        const timer = setTimeout(() => {
          setJustRevealedIds((prev) => {
            const next = new Set(prev)
            next.delete(groupId)
            return next
          })
        }, 2000)
        glowTimers.current.set(groupId, timer)
      }
    },
    [reducedMotion]
  )

  const revealAll = useCallback(() => {
    const committedIds = cards
      .filter((c) => c.paragraph !== null && c.paragraph.trim() !== '')
      .map((c) => c.groupId)
    setRevealedIds(new Set(committedIds))

    if (!reducedMotion) {
      setJustRevealedIds(new Set(committedIds))
      committedIds.forEach((id) => {
        const existing = glowTimers.current.get(id)
        if (existing) clearTimeout(existing)
        const timer = setTimeout(() => {
          setJustRevealedIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 2000)
        glowTimers.current.set(id, timer)
      })
    }
  }, [cards, reducedMotion])

  const pin = useCallback((groupId: string) => {
    setPinnedIds((prev) => (prev.includes(groupId) ? prev : [groupId, ...prev]))
  }, [])

  const unpin = useCallback((groupId: string) => {
    setPinnedIds((prev) => prev.filter((id) => id !== groupId))
  }, [])

  const hide = useCallback((groupId: string) => {
    setHiddenIds((prev) => new Set(prev).add(groupId))
    // Unpin if pinned.
    setPinnedIds((prev) => prev.filter((id) => id !== groupId))
  }, [])

  const unhide = useCallback((groupId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      next.delete(groupId)
      return next
    })
  }, [])

  // ── Ordered card list ─────────────────────────────────────────────────────────

  const orderedCards = useMemo<GroupCard[]>(() => {
    const pinned = pinnedIds
      .map((id) => cards.find((c) => c.groupId === id))
      .filter((c): c is GroupCard => c !== undefined)
    const unpinned = cards.filter((c) => !pinnedIds.includes(c.groupId))
    return [...pinned, ...unpinned]
  }, [cards, pinnedIds])

  const committedCount = cards.filter(
    (c) => c.paragraph !== null && c.paragraph.trim() !== ''
  ).length
  const hiddenCount = hiddenIds.size

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6" data-testid="reveal-controls">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={revealAll}
          disabled={committedCount === 0}
          data-testid="reveal-all-btn"
          className={cn(
            'flex items-center gap-1.5 rounded-ga-sm px-4 py-2 font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70 disabled:cursor-not-allowed disabled:opacity-40',
            'bg-ga-primary text-white hover:bg-ga-primary-dark'
          )}
        >
          <Eye size={14} aria-hidden="true" />
          Reveal all
        </button>

        {cards.length === 0 && (
          <p className={cn('font-sans text-sm', isDark ? 'text-white/40' : 'text-ga-ink-muted')}>
            No groups found for this lesson.
          </p>
        )}
      </div>

      {/* Card grid */}
      <div
        data-testid="card-grid"
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}
      >
        {orderedCards.map((card) => (
          <ResponseCard
            key={card.groupId}
            groupId={card.groupId}
            groupName={card.groupName}
            paragraph={card.paragraph}
            isRevealed={revealedIds.has(card.groupId)}
            isPinned={pinnedIds.includes(card.groupId)}
            isHidden={hiddenIds.has(card.groupId)}
            showHidden={showHidden}
            justRevealed={justRevealedIds.has(card.groupId)}
            onReveal={() => reveal(card.groupId)}
            onPin={() => pin(card.groupId)}
            onUnpin={() => unpin(card.groupId)}
            onHide={() => hide(card.groupId)}
            onUnhide={() => unhide(card.groupId)}
            theme={theme}
          />
        ))}
      </div>

      {/* Show hidden toggle */}
      {hiddenCount > 0 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            data-testid="show-hidden-toggle"
            className={cn(
              'rounded-ga-sm px-4 py-2 font-sans text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/70',
              showHidden
                ? 'text-ga-primary underline'
                : isDark
                  ? 'text-white/40 hover:text-white/70'
                  : 'text-ga-ink-muted hover:text-ga-ink'
            )}
          >
            {showHidden
              ? `Hide ${hiddenCount} hidden card${hiddenCount !== 1 ? 's' : ''}`
              : `Show ${hiddenCount} hidden card${hiddenCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
