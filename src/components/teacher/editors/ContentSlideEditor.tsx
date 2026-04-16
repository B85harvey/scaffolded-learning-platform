/**
 * ContentSlideEditor — split-pane editor for 'content' type slides.
 *
 * Left half: title input + markdown body textarea.
 * Right half: live preview using the same SlideContent renderer students see.
 * Below the textarea: image section (upload → Storage, alt text, remove).
 */
import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { SlideContent } from '@/components/lesson/slides/SlideContent'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toast'

export interface ContentConfig {
  id: string
  type: 'content'
  section: string
  title?: string
  body: string
  image?: { src: string; alt: string }
}

interface Props {
  config: ContentConfig
  lessonId: string
  onConfigChange: (config: ContentConfig) => void
}

export function ContentSlideEditor({ config, lessonId, onConfigChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [altWarning, setAltWarning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleBodyChange(body: string) {
    onConfigChange({ ...config, body })
  }

  function handleTitleChange(title: string) {
    onConfigChange({ ...config, title: title || undefined })
  }

  function handleAltChange(alt: string) {
    if (!config.image) return
    setAltWarning(alt.trim() === '')
    onConfigChange({ ...config, image: { ...config.image, alt } })
  }

  function handleRemoveImage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...rest } = config
    onConfigChange({ ...rest } as ContentConfig)
    setAltWarning(false)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const path = `${lessonId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('lesson-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      toast('Image upload failed. You can paste a URL below.')
      // Allow manual URL fallback via paste — show URL input
      onConfigChange({ ...config, image: { src: '', alt: '' } })
      return
    }

    const { data: urlData } = supabase.storage.from('lesson-images').getPublicUrl(path)
    onConfigChange({ ...config, image: { src: urlData.publicUrl, alt: '' } })
    setAltWarning(true) // nudge teacher to add alt text
    setUploading(false)
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUrlPaste(src: string) {
    onConfigChange({ ...config, image: { src, alt: config.image?.alt ?? '' } })
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* ── Main split pane ─────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-0 divide-x divide-ga-border-subtle">
        {/* Left: editing controls */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto p-6">
          {/* Title */}
          <div>
            <label
              htmlFor="slide-title"
              className="mb-1 block text-xs font-medium text-ga-ink-muted"
            >
              Title (optional)
            </label>
            <input
              id="slide-title"
              type="text"
              value={config.title ?? ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Slide title…"
              className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-3 py-2 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
            />
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col">
            <label
              htmlFor="slide-body"
              className="mb-1 block text-xs font-medium text-ga-ink-muted"
            >
              Body (markdown)
            </label>
            <textarea
              id="slide-body"
              value={config.body}
              onChange={(e) => handleBodyChange(e.target.value)}
              placeholder="Write slide content in markdown…"
              className="min-h-[200px] flex-1 resize-none rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-3 py-2 font-mono text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
            />
          </div>

          {/* Image section */}
          <div className="rounded-ga-sm border border-ga-border-subtle bg-ga-surface-muted p-4">
            <p className="mb-3 text-xs font-medium text-ga-ink-muted">Image (optional)</p>

            {config.image ? (
              <div className="space-y-3">
                {/* Thumbnail */}
                {config.image.src && (
                  <img
                    src={config.image.src}
                    alt={config.image.alt || 'Slide image preview'}
                    data-testid="image-thumbnail"
                    className="h-32 w-full rounded-ga-sm object-cover"
                  />
                )}

                {/* URL paste fallback (shown if src is empty) */}
                {!config.image.src && (
                  <input
                    type="url"
                    aria-label="Image URL"
                    placeholder="Paste image URL…"
                    className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-3 py-2 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
                    onChange={(e) => void handleUrlPaste(e.target.value)}
                  />
                )}

                {/* Alt text */}
                <div>
                  <label
                    htmlFor="slide-alt"
                    className="mb-1 block text-xs font-medium text-ga-ink-muted"
                  >
                    Alt text
                    {altWarning && (
                      <span role="alert" data-testid="alt-warning" className="ml-2 text-ga-warning">
                        Required for accessibility
                      </span>
                    )}
                  </label>
                  <input
                    id="slide-alt"
                    type="text"
                    value={config.image.alt}
                    onChange={(e) => handleAltChange(e.target.value)}
                    placeholder="Describe the image…"
                    className="w-full rounded-ga-sm border border-ga-border-subtle bg-ga-surface px-3 py-2 font-sans text-sm text-ga-ink placeholder:text-ga-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 focus-visible:ring-offset-1"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1.5 rounded-ga-sm px-2 py-1 text-xs text-ga-ink-muted hover:text-ga-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50"
                >
                  <X size={12} aria-hidden="true" />
                  Remove image
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  aria-label="Upload image"
                  className="sr-only"
                  onChange={(e) => void handleFileSelect(e)}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-ga-sm border border-dashed border-ga-border-strong px-4 py-2 text-sm text-ga-ink-muted hover:border-ga-primary hover:text-ga-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ga-primary/50 disabled:opacity-50"
                >
                  <ImagePlus size={16} aria-hidden="true" />
                  {uploading ? 'Uploading…' : 'Add image'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex w-1/2 flex-col overflow-y-auto bg-ga-surface-muted p-8">
          <p className="mb-6 text-xs font-medium text-ga-ink-muted">Preview</p>
          <SlideContent title={config.title} body={config.body} image={config.image} />
        </div>
      </div>
    </div>
  )
}
