/**
 * triggerDownload — initiates a browser file download from a Blob.
 *
 * Creates a temporary object URL, clicks a hidden anchor element to start the
 * download, then revokes the URL to free memory.
 */
export function triggerDocxDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
