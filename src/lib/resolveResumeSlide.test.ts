/**
 * resolveResumeSlide tests.
 *
 * Uses minimal slide arrays to keep tests focused. All slide indices are
 * zero-based. Scaffold slides have unique section keys; the function only
 * looks at slide.type and slide.section (no config detail needed).
 */
import { describe, it, expect } from 'vitest'
import { resolveResumeSlide } from './resolveResumeSlide'
import type { SlideConfig, CommittedParagraph } from '@/lessons/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Build a minimal scaffold slide. */
function scaffoldSlide(id: string, section: SlideConfig['section']): SlideConfig {
  return {
    id,
    type: 'scaffold',
    section,
    mode: 'framed',
    config: {
      id,
      targetQuestion: '',
      mode: 'framed',
    },
  }
}

function contentSlide(id: string): SlideConfig {
  return { id, type: 'content', section: 'orientation', body: '' }
}

function reviewSlide(): SlideConfig {
  return { id: 'review', type: 'review', section: 'review' }
}

function committed(section: string): CommittedParagraph {
  return {
    section: section as CommittedParagraph['section'],
    text: 'x',
    warnings: [],
    committedAt: 1000,
  }
}

// ── Slides used in most tests ─────────────────────────────────────────────────
//
// Index: 0=content, 1=scaffold(aim), 2=scaffold(issues), 3=scaffold(decision),
//        4=scaffold(justification), 5=review
const BASE_SLIDES: SlideConfig[] = [
  contentSlide('slide-0'),
  scaffoldSlide('slide-1', 'aim'),
  scaffoldSlide('slide-2', 'issues'),
  scaffoldSlide('slide-3', 'decision'),
  scaffoldSlide('slide-4', 'justification'),
  reviewSlide(),
]

// ── Test case 1: Aim committed, Issues not ────────────────────────────────────

describe('resolveResumeSlide — Test case 1: Aim committed, Issues not', () => {
  it('resumes at the Issues scaffold slide (first uncommitted)', () => {
    const committed_map = { aim: committed('aim') }
    // Student was at index 4 (past the uncommitted Issues slide)
    const result = resolveResumeSlide(BASE_SLIDES, committed_map, 4, {})
    // Issues scaffold is at index 2
    expect(result).toBe(2)
  })
})

// ── Test case 2: all sections committed ──────────────────────────────────────

describe('resolveResumeSlide — Test case 2: all sections committed', () => {
  it('resumes at the Review slide when everything is done', () => {
    const committed_map = {
      aim: committed('aim'),
      issues: committed('issues'),
      decision: committed('decision'),
      justification: committed('justification'),
    }
    const result = resolveResumeSlide(BASE_SLIDES, committed_map, 5, {})
    // Review slide is at index 5
    expect(result).toBe(5)
  })
})

// ── Test case 3: lock before first uncommitted ────────────────────────────────

describe('resolveResumeSlide — Test case 3: locked slide is the binding constraint', () => {
  it('resumes at the first uncommitted when the lock is after it', () => {
    // aim+issues committed → first uncommitted = decision at index 3
    // slide-4 (justification, index 4) is locked
    const committed_map = {
      aim: committed('aim'),
      issues: committed('issues'),
    }
    const locks = { 'slide-4': true }
    // Student was at index 4
    const result = resolveResumeSlide(BASE_SLIDES, committed_map, 4, locks)
    // min(firstUncommitted=3, lastLocked=4) = 3; min(progress=4, 3) = 3
    expect(result).toBe(3)
  })

  it('resumes at the locked slide when the lock is before first uncommitted', () => {
    // aim committed → first uncommitted = issues at index 2
    // slide-1 (aim, index 1) is locked — BEFORE first uncommitted
    const committed_map = { aim: committed('aim') }
    const locks = { 'slide-1': true }
    const result = resolveResumeSlide(BASE_SLIDES, committed_map, 3, locks)
    // min(firstUncommitted=2, lastLocked=1) = 1; min(progress=3, 1) = 1
    expect(result).toBe(1)
  })
})

// ── Test case 4: progress position is earlier than calculated resume ──────────

describe('resolveResumeSlide — Test case 4: respect student backwards navigation', () => {
  it('uses the progress index when the student navigated back past the resume point', () => {
    // issues not committed → resume would be issues scaffold at index 2
    const committed_map = { aim: committed('aim') }
    // Student's progress shows they are at index 0 (navigated all the way back)
    const result = resolveResumeSlide(BASE_SLIDES, committed_map, 0, {})
    // min(progress=0, resume=2) = 0
    expect(result).toBe(0)
  })

  it('uses the resume index when the student was ahead of it', () => {
    // issues not committed → resume = index 2
    const committed_map = { aim: committed('aim') }
    // Student's progress shows index 4 (they were ahead)
    const result = resolveResumeSlide(BASE_SLIDES, committed_map, 4, {})
    // min(progress=4, resume=2) = 2
    expect(result).toBe(2)
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('resolveResumeSlide — edge cases', () => {
  it('returns 0 when no sections are committed and progress is 0', () => {
    // No committed sections → first uncommitted = slide at index 1 (aim scaffold)
    // Student is at index 0 → min(0, 1) = 0
    const result = resolveResumeSlide(BASE_SLIDES, {}, 0, {})
    expect(result).toBe(0)
  })

  it('handles slides with no scaffold slides (returns last slide)', () => {
    const slides: SlideConfig[] = [contentSlide('a'), contentSlide('b'), reviewSlide()]
    const result = resolveResumeSlide(slides, {}, 2, {})
    // No scaffold slides → fallback to review at index 2; min(2, 2) = 2
    expect(result).toBe(2)
  })
})
