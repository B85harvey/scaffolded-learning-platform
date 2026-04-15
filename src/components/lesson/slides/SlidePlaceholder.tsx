interface SlidePlaceholderProps {
  type: 'mcq' | 'scaffold' | 'review'
}

export function SlidePlaceholder({ type }: SlidePlaceholderProps) {
  const label =
    type === 'mcq' ? 'Multiple choice question' : type === 'scaffold' ? 'Scaffold' : 'Review'

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-ga-md border border-dashed border-ga-border-subtle bg-ga-surface-muted p-10 text-center">
      <p className="text-base font-medium text-ga-ink">{label} slide coming in the next slice.</p>
      <p className="mt-2 text-sm text-ga-ink-muted">Slide type: {type}</p>
    </div>
  )
}
