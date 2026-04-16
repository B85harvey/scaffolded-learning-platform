/**
 * hydrateLesson — reconstruct full lesson state from Supabase + Dexie.
 *
 * Fetches lesson_submissions (committed paragraphs + MCQ results),
 * lesson_drafts (server-side draft cache), and lesson_progress in parallel,
 * then merges with the local Dexie draft store — picking the newer value
 * per prompt when both sources have a record.
 *
 * hydrateLessonFromDexie is the Dexie-only fallback used when Supabase is
 * unreachable.
 */
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexieDb'
import type { DraftRecord } from '@/lib/dexieDb'
import type { SlideAnswers, CommittedParagraph } from '@/lessons/types'

export interface HydratedLesson {
  answers: Record<string, SlideAnswers>
  committed: Record<string, CommittedParagraph>
  currentSlideIndex: number
  status: 'not_started' | 'in_progress' | 'complete'
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Reconstruct SlideAnswers from a flat list of { slideId, promptId, value }
 * records. Prompts matching /^row-\d+$/ are treated as freeform-table rows;
 * everything else becomes a text answer.
 */
function answersFromDrafts(
  drafts: Pick<DraftRecord, 'slideId' | 'promptId' | 'value'>[]
): Record<string, SlideAnswers> {
  const grouped: Record<string, Record<string, string>> = {}
  for (const d of drafts) {
    if (!grouped[d.slideId]) grouped[d.slideId] = {}
    grouped[d.slideId][d.promptId] = d.value
  }

  const answers: Record<string, SlideAnswers> = {}

  for (const [slideId, prompts] of Object.entries(grouped)) {
    const ids = Object.keys(prompts)
    const isTable = ids.length > 0 && ids.every((id) => /^row-\d+$/.test(id))

    if (isTable) {
      const rows: Array<Record<string, string>> = []
      for (const promptId of ids) {
        const idx = parseInt(promptId.slice(4), 10) // strip 'row-' prefix
        try {
          rows[idx] = JSON.parse(prompts[promptId]) as Record<string, string>
        } catch {
          rows[idx] = {}
        }
      }
      answers[slideId] = { kind: 'table', rows }
    } else {
      answers[slideId] = { kind: 'text', values: { ...prompts } }
    }
  }

  return answers
}

// ── Dexie-only fallback ───────────────────────────────────────────────────────

/**
 * Reconstruct lesson state from the local Dexie store only. Used when
 * Supabase is unreachable. Returns empty committed and default progress.
 */
export async function hydrateLessonFromDexie(lessonId: string): Promise<HydratedLesson> {
  const drafts = await db.drafts.where('lessonId').equals(lessonId).toArray()
  return {
    answers: answersFromDrafts(drafts),
    committed: {},
    currentSlideIndex: 0,
    status: 'not_started',
  }
}

// ── Full hydration ────────────────────────────────────────────────────────────

export async function hydrateLesson(
  studentId: string | null,
  lessonId: string
): Promise<HydratedLesson> {
  if (!studentId) {
    return { answers: {}, committed: {}, currentSlideIndex: 0, status: 'not_started' }
  }

  // Fetch Supabase data and local Dexie drafts in parallel.
  const [submissionsResult, serverDraftsResult, progressResult, dexieDrafts] = await Promise.all([
    supabase
      .from('lesson_submissions')
      .select('slide_id, section, prompt_answers, committed_paragraph, committed_at')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId),
    supabase
      .from('lesson_drafts')
      .select('slide_id, prompt_id, value, updated_at')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId),
    supabase
      .from('lesson_progress')
      .select('current_slide_index, status')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle(),
    db.drafts.where('lessonId').equals(lessonId).toArray(),
  ])

  // Surface Supabase errors so the caller can fall back to Dexie-only.
  if (submissionsResult.error) throw submissionsResult.error
  if (serverDraftsResult.error) throw serverDraftsResult.error
  if (progressResult.error) throw progressResult.error

  // ── committed: scaffold submissions where section is set ─────────────────

  const committed: Record<string, CommittedParagraph> = {}
  for (const row of submissionsResult.data ?? []) {
    if (row.section !== null && row.committed_paragraph !== null) {
      committed[row.section] = {
        section: row.section as CommittedParagraph['section'],
        text: row.committed_paragraph,
        warnings: [],
        committedAt: new Date(row.committed_at).getTime(),
      }
    }
  }

  // ── answers: merge server drafts and Dexie, newer wins per prompt ─────────

  type Entry = { value: string; updatedAt: number }
  const merged: Record<string, Record<string, Entry>> = {}

  // Server drafts first
  for (const row of serverDraftsResult.data ?? []) {
    if (!merged[row.slide_id]) merged[row.slide_id] = {}
    merged[row.slide_id][row.prompt_id] = {
      value: row.value ?? '',
      updatedAt: new Date(row.updated_at).getTime(),
    }
  }

  // Dexie overwrites when strictly newer
  for (const draft of dexieDrafts) {
    if (!merged[draft.slideId]) merged[draft.slideId] = {}
    const existing = merged[draft.slideId][draft.promptId]
    if (!existing || draft.updatedAt > existing.updatedAt) {
      merged[draft.slideId][draft.promptId] = { value: draft.value, updatedAt: draft.updatedAt }
    }
  }

  // Flatten merged map back to a list for answersFromDrafts
  const flatDrafts: Pick<DraftRecord, 'slideId' | 'promptId' | 'value'>[] = []
  for (const [slideId, prompts] of Object.entries(merged)) {
    for (const [promptId, entry] of Object.entries(prompts)) {
      flatDrafts.push({ slideId, promptId, value: entry.value })
    }
  }
  const answers = answersFromDrafts(flatDrafts)

  // ── MCQ results: set mcqResult:'correct' from MCQ submissions ────────────

  for (const row of submissionsResult.data ?? []) {
    if (row.section === null && row.prompt_answers !== null) {
      const pa = row.prompt_answers as Record<string, unknown>
      if (typeof pa['selectedOption'] === 'string') {
        const existing = answers[row.slide_id]
        const values = existing?.kind === 'text' ? { ...existing.values } : {}
        values['mcqResult'] = 'correct'
        values['mcqSelection'] = pa['selectedOption']
        answers[row.slide_id] = { kind: 'text', values }
      }
    }
  }

  // ── progress ──────────────────────────────────────────────────────────────

  const progress = progressResult.data
  return {
    answers,
    committed,
    currentSlideIndex: progress?.current_slide_index ?? 0,
    status: (progress?.status ?? 'not_started') as HydratedLesson['status'],
  }
}
