/**
 * resolveResumeSlide — calculate the slide index to navigate to on lesson load.
 *
 * Resume point algorithm:
 *   (a) firstUncommittedIdx — the index of the first scaffold slide whose
 *       section has no committed paragraph (or the Review slide if all done).
 *   (b) lastLockedIdx — the highest index where locks[slide.id] === true
 *       (Infinity when there are no active locks).
 *
 *   resumeIdx = Math.min(a, b)
 *
 * The student's last known position (currentSlideIndex from progress) is
 * respected when they manually navigated backwards:
 *   if progress < resumeIdx → use progress (don't fast-forward the student)
 *   otherwise              → use resumeIdx
 *
 * This is equivalent to Math.min(currentSlideIndex, resumeIdx).
 */
import type { SlideConfig, CommittedParagraph } from '@/lessons/types'

export function resolveResumeSlide(
  slides: SlideConfig[],
  committed: Record<string, CommittedParagraph>,
  currentSlideIndex: number,
  locks: Record<string, boolean>
): number {
  // (a) Find the first scaffold slide whose section is not yet committed.
  let firstUncommittedIdx: number | null = null
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    if (slide.type === 'scaffold' && !committed[slide.section]) {
      firstUncommittedIdx = i
      break
    }
  }

  // If all scaffold slides are committed, fall back to the Review slide (or last slide).
  if (firstUncommittedIdx === null) {
    const reviewIdx = slides.findIndex((s) => s.type === 'review')
    firstUncommittedIdx = reviewIdx !== -1 ? reviewIdx : slides.length - 1
  }

  // (b) Find the last locked slide index.
  let lastLockedIdx = Infinity
  for (let i = 0; i < slides.length; i++) {
    if (locks[slides[i].id] === true) {
      lastLockedIdx = i
    }
  }

  // Resume is the earlier of the first incomplete work and the last lock.
  const resumeIdx = Math.min(firstUncommittedIdx, lastLockedIdx)

  // Respect student's manually chosen position if they navigated backwards.
  return Math.min(currentSlideIndex, resumeIdx)
}
