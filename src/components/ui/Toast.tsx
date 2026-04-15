/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'info'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

type ToastHandler = (item: ToastItem) => void

// ── Module-level bus ──────────────────────────────────────────────────────────

const listeners = new Set<ToastHandler>()

/**
 * Trigger a toast notification. Safe to call from anywhere — outside React or
 * inside event handlers. Message is broadcast to any mounted ToastRegion.
 */
export function toast(message: string, options?: { variant?: ToastVariant }): void {
  const item: ToastItem = {
    id: crypto.randomUUID(),
    message,
    variant: options?.variant ?? 'default',
  }
  listeners.forEach((fn) => fn(item))
}

/** Returns the `toast` function. Convenience hook for use inside components. */
export function useToast(): typeof toast {
  return toast
}

// ── Variant classes ───────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'bg-ga-surface border border-ga-border-strong text-ga-ink',
  success: 'bg-ga-green text-white',
  info: 'bg-ga-primary text-white',
}

// ── ToastRegion ───────────────────────────────────────────────────────────────

/**
 * Mount once near the root of the app (inside LessonShell).
 *
 * Manages a FIFO queue of up to 3 toasts. Each auto-dismisses after 3 seconds
 * or on click. Respects prefers-reduced-motion by suppressing the slide-in
 * animation when reduced motion is preferred.
 */
export function ToastRegion() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const reducedMotion = useReducedMotion()

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const handler: ToastHandler = (item) => {
      setToasts((prev) => {
        // Cap at 3 FIFO — drop oldest when full
        const next = prev.length >= 3 ? [...prev.slice(1), item] : [...prev, item]
        return next
      })
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
        timersRef.current.delete(item.id)
      }, 3000)
      timersRef.current.set(item.id, timer)
    }

    const timers = timersRef.current
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      data-testid="toast-region"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          data-testid="toast-item"
          aria-label={`Dismiss: ${t.message}`}
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto max-w-xs rounded-ga-md px-4 py-3 text-left shadow-ga-md',
            'font-sans text-sm font-medium',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/40 focus-visible:ring-offset-2',
            !reducedMotion && 'toast-enter',
            VARIANT_CLASSES[t.variant]
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
