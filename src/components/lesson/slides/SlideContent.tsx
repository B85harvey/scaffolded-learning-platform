import { MarkdownBody } from '@/components/MarkdownBody'

interface SlideContentProps {
  title?: string
  body: string
  image?: { src: string; alt: string }
}

export function SlideContent({ title, body, image }: SlideContentProps) {
  return (
    <article className="mx-auto w-full max-w-[820px]">
      {image && (
        <img src={image.src} alt={image.alt} className="mb-6 w-full rounded-ga-md object-cover" />
      )}

      {title && (
        <h2 className="mb-6 font-sans text-2xl font-semibold leading-8 text-ga-ink">{title}</h2>
      )}

      <MarkdownBody className="max-w-[64ch] font-sans text-base leading-relaxed text-ga-ink">
        {body}
      </MarkdownBody>
    </article>
  )
}
