/**
 * ResponseCard — displays one group's scaffold response on the Live Wall.
 *
 * Hidden state:
 *   committed   → group name + "Response ready"
 *   waiting     → group name + "Waiting for response…"
 *
 * Revealed state:
 *   committed   → group name + committed paragraph (20 px)
 *   waiting     → group name + "Waiting for response…"
 *
 * Pin / hide controls appear on revealed cards (opacity-0 default,
 * visible on keyboard focus or hover via CSS group class).
 */
import { Pin, PinOff, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  groupId: string
  groupName: string
  paragraph: string | null
  isRevealed: boolean
  isPinned: boolean
  isHidden: boolean
  showHidden: boolean
  justRevealed: boolean
  onReveal: () => void
  onPin: () => void
  onUnpin: () => void
  onHide: () => void
  onUnhide: () => void
  theme: 'dark' | 'light'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResponseCard({
  groupId,
  groupName,
  paragraph,
  isRevealed,
  isPinned,
  isHidden,
  showHidden,
  justRevealed,
  onReveal,
  onPin,
  onUnpin,
  onHide,
  onUnhide,
  theme,
}: Props) {
  const isDark = theme === 'dark'
  const hasResponse = paragraph !== null && paragraph.trim() !== ''
  const isClickable = !isRevealed && hasResponse

  // Hidden cards only render when showHidden is true.
  if (isHidden && !showHidden) return null

  return (
    <article
      data-testid={`response-card-${groupId}`}
      aria-label={groupName}
      onClick={isClickable ? onReveal : undefined}
      className={cn(
        'group relative rounded-ga-lg border p-6 transition-all',
        isDark
          ? 'border-white/10 bg-[#2a2d35] text-white'
          : 'border-ga-border-subtle bg-white text-ga-ink',
        isHidden && 'opacity-50',
        isClickable && 'cursor-pointer hover:border-ga-primary/60',
        justRevealed && 'ring-2 ring-ga-primary ring-offset-2'
      )}
      style={
        isHidden
          ? {
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(128,128,128,0.08) 0, rgba(128,128,128,0.08) 1px, transparent 0, transparent 50%)',
              backgroundSize: '10px 10px',
            }
          : undefined
      }
    >
      {/* Group name */}
      <h2
        className={cn('font-sans font-bold leading-tight', isDark ? 'text-white' : 'text-ga-ink')}
        style={{ fontSize: '24px' }}
        data-testid={`card-group-name-${groupId}`}
      >
        {groupName}
        {isPinned && (
          <span className="ml-2 font-sans text-xs font-normal text-ga-primary" aria-label="Pinned">
            (pinned)
          </span>
        )}
      </h2>

      {/* Body */}
      <div className="mt-3">
        {isRevealed && hasResponse ? (
          <p
            className={cn('font-sans leading-relaxed', isDark ? 'text-white/90' : 'text-ga-ink')}
            style={{ fontSize: '20px' }}
            data-testid={`card-paragraph-${groupId}`}
          >
            {paragraph}
          </p>
        ) : isRevealed && !hasResponse ? (
          <p
            className={cn('font-sans italic', isDark ? 'text-white/40' : 'text-ga-ink-muted')}
            style={{ fontSize: '20px' }}
          >
            Waiting for response…
          </p>
        ) : hasResponse ? (
          <p
            className={cn(
              'font-sans text-sm font-medium',
              isDark ? 'text-white/50' : 'text-ga-ink-muted'
            )}
            data-testid={`card-ready-${groupId}`}
          >
            Response ready
          </p>
        ) : (
          <p
            className={cn(
              'font-sans text-sm italic',
              isDark ? 'text-white/40' : 'text-ga-ink-muted'
            )}
            data-testid={`card-waiting-${groupId}`}
          >
            Waiting for response…
          </p>
        )}
      </div>

      {/* Pin / hide controls — only on revealed, non-hidden cards */}
      {isRevealed && !isHidden && (
        <div
          className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          aria-label={`Controls for ${groupName}`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (isPinned) {
                onUnpin()
              } else {
                onPin()
              }
            }}
            aria-label={isPinned ? `Unpin ${groupName}` : `Pin ${groupName}`}
            data-testid={isPinned ? `unpin-${groupId}` : `pin-${groupId}`}
            className={cn(
              'rounded-ga-sm p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50',
              isDark
                ? 'text-white/40 hover:text-ga-primary'
                : 'text-ga-ink-muted hover:text-ga-primary'
            )}
          >
            {isPinned ? (
              <PinOff size={14} aria-hidden="true" />
            ) : (
              <Pin size={14} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onHide()
            }}
            aria-label={`Hide ${groupName}`}
            data-testid={`hide-${groupId}`}
            className={cn(
              'rounded-ga-sm p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50',
              isDark ? 'text-white/40 hover:text-ga-red' : 'text-ga-ink-muted hover:text-ga-red'
            )}
          >
            <EyeOff size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Unhide button when browsing hidden cards */}
      {isHidden && showHidden && (
        <button
          type="button"
          onClick={onUnhide}
          data-testid={`unhide-${groupId}`}
          className="mt-3 font-sans text-xs text-ga-primary underline hover:text-ga-primary-dark focus-visible:outline-none"
        >
          Unhide
        </button>
      )}
    </article>
  )
}
