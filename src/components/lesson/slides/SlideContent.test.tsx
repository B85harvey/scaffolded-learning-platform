import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SlideContent } from './SlideContent'

describe('SlideContent', () => {
  describe('heading', () => {
    it('renders the heading when provided', () => {
      const { getByRole } = render(<SlideContent title="The Aim" body="Body text." />)
      expect(getByRole('heading', { name: 'The Aim' })).toBeInTheDocument()
    })

    it('does not render a heading element when title is omitted', () => {
      const { queryByRole } = render(<SlideContent body="Body text." />)
      expect(queryByRole('heading')).toBeNull()
    })
  })

  describe('image', () => {
    it('renders an image with the provided alt text when supplied', () => {
      const { getByAltText } = render(
        <SlideContent body="Body text." image={{ src: '/test.jpg', alt: 'A test image' }} />
      )
      expect(getByAltText('A test image')).toBeInTheDocument()
    })

    it('does not render an img element when no image is supplied', () => {
      const { queryByRole } = render(<SlideContent body="Body text." />)
      expect(queryByRole('img')).toBeNull()
    })
  })

  describe('body', () => {
    it('renders plain paragraph text', () => {
      const { getByText } = render(<SlideContent body="This is a plain paragraph." />)
      expect(getByText('This is a plain paragraph.')).toBeInTheDocument()
    })

    it('renders bold text wrapped in <strong>', () => {
      const { container } = render(<SlideContent body="This is **bold** text." />)
      const strong = container.querySelector('strong')
      expect(strong).toBeInTheDocument()
      expect(strong?.textContent).toBe('bold')
    })

    it('renders italic text wrapped in <em>', () => {
      const { container } = render(<SlideContent body="This is *italic* text." />)
      const em = container.querySelector('em')
      expect(em).toBeInTheDocument()
      expect(em?.textContent).toBe('italic')
    })

    it('renders a numbered list', () => {
      const { container } = render(
        <SlideContent body={'1. First item\n2. Second item\n3. Third item'} />
      )
      const ol = container.querySelector('ol')
      expect(ol).toBeInTheDocument()
      expect(ol?.querySelectorAll('li')).toHaveLength(3)
    })

    it('renders an unordered list', () => {
      const { container } = render(<SlideContent body={'- Alpha\n- Beta\n- Gamma'} />)
      const ul = container.querySelector('ul')
      expect(ul).toBeInTheDocument()
      expect(ul?.querySelectorAll('li')).toHaveLength(3)
    })
  })

  describe('snapshots', () => {
    it('matches snapshot: title + body, no image', () => {
      const { container } = render(
        <SlideContent
          title="Section 1: The Aim"
          body="The Aim is one sharp sentence that states what the task requires."
        />
      )
      expect(container.firstChild).toMatchSnapshot()
    })

    it('matches snapshot: no title, no image, body only', () => {
      const { container } = render(
        <SlideContent body="Four rules apply to everything you write." />
      )
      expect(container.firstChild).toMatchSnapshot()
    })

    it('matches snapshot: title + image + body', () => {
      const { container } = render(
        <SlideContent
          title="Slide with image"
          body="Some body text."
          image={{ src: '/hero.png', alt: 'Hero image' }}
        />
      )
      expect(container.firstChild).toMatchSnapshot()
    })
  })
})
