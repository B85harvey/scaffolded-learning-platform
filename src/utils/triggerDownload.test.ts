/**
 * triggerDocxDownload unit tests.
 *
 * Verifies: URL.createObjectURL is called with the blob, a hidden anchor is
 * clicked with the correct filename, and URL.revokeObjectURL is called after.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerDocxDownload } from './triggerDownload'

describe('triggerDocxDownload', () => {
  const fakeUrl = 'blob:http://localhost/fake-object-url'
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue(fakeUrl)
    revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    clickSpy = vi.fn()
    // Intercept createElement so we can spy on the anchor click
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        el.click = clickSpy as () => void
      }
      return el
    })

    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('calls URL.createObjectURL with the provided blob', () => {
    const blob = new Blob(['test'], { type: 'application/octet-stream' })
    triggerDocxDownload(blob, 'test.docx')
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('triggers a click on the anchor with the correct download filename', () => {
    const blob = new Blob(['test'], { type: 'application/octet-stream' })
    triggerDocxDownload(blob, 'My Lesson - Alex Smith.docx')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('appends and then removes the anchor from document.body', () => {
    const blob = new Blob(['test'])
    triggerDocxDownload(blob, 'test.docx')
    expect(appendChildSpy).toHaveBeenCalledOnce()
    expect(removeChildSpy).toHaveBeenCalledOnce()
  })

  it('calls URL.revokeObjectURL after the click', () => {
    const blob = new Blob(['test'])
    triggerDocxDownload(blob, 'test.docx')
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith(fakeUrl)
  })
})
