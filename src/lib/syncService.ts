/**
 * syncService — Supabase write path for lesson data.
 *
 * All functions accept an optional `studentId: string | null`. When null
 * (unauthenticated — Phase 3 pre-auth wiring), the call is a no-op and
 * returns early. Dexie still holds the data locally.
 *
 * Each function calls setSyncStatus on the module-level bus so that
 * SaveStatusChip reflects the current state without prop drilling.
 */
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/dexieDb'
import type { Json } from '@/types/supabase'
import { setSyncStatus } from '@/contexts/SyncStatusContext'

// ── commitToSupabase ──────────────────────────────────────────────────────────

/**
 * Upserts a committed scaffold paragraph into lesson_submissions, then
 * marks the matching Dexie draft records as synced.
 */
export async function commitToSupabase(
  studentId: string | null,
  lessonId: string,
  slideId: string,
  section: string,
  promptAnswers: Json,
  committedParagraph: string
): Promise<{ success: boolean; error?: string }> {
  if (!studentId) return { success: false, error: 'No student id' }

  setSyncStatus('saving')

  const { error } = await supabase.from('lesson_submissions').upsert({
    student_id: studentId,
    lesson_id: lessonId,
    slide_id: slideId,
    section,
    prompt_answers: promptAnswers,
    committed_paragraph: committedParagraph,
    committed_at: new Date().toISOString(),
  })

  if (error) {
    setSyncStatus('error')
    return { success: false, error: error.message }
  }

  // Mark all draft records for this slide as synced
  const now = Date.now()
  await db.drafts.where('[lessonId+slideId]').equals([lessonId, slideId]).modify({ syncedAt: now })

  setSyncStatus('saved')
  return { success: true }
}

// ── saveMcqAnswer ─────────────────────────────────────────────────────────────

/**
 * Records a correct MCQ answer in lesson_submissions.
 * section is null; committed_paragraph is null.
 */
export async function saveMcqAnswer(
  studentId: string | null,
  lessonId: string,
  slideId: string,
  selectedOption: string
): Promise<{ success: boolean; error?: string }> {
  if (!studentId) return { success: false, error: 'No student id' }

  setSyncStatus('saving')

  const { error } = await supabase.from('lesson_submissions').upsert({
    student_id: studentId,
    lesson_id: lessonId,
    slide_id: slideId,
    section: null,
    prompt_answers: { selectedOption } as Json,
    committed_paragraph: null,
  })

  if (error) {
    setSyncStatus('error')
    return { success: false, error: error.message }
  }

  setSyncStatus('saved')
  return { success: true }
}

// ── updateProgress ────────────────────────────────────────────────────────────

/**
 * Upserts the student's current slide position and lesson status.
 * Best-effort — failures are silently ignored (progress is cosmetic).
 */
export async function updateProgress(
  studentId: string | null,
  lessonId: string,
  currentSlideIndex: number,
  status: 'not_started' | 'in_progress' | 'complete'
): Promise<void> {
  if (!studentId) return

  await supabase.from('lesson_progress').upsert({
    student_id: studentId,
    lesson_id: lessonId,
    current_slide_index: currentSlideIndex,
    status,
    updated_at: new Date().toISOString(),
  })
}

// ── syncDirtyDrafts ───────────────────────────────────────────────────────────

/**
 * Reads all Dexie draft records for this lesson where syncedAt is null or
 * less than updatedAt (written locally but not yet in Supabase), batch-upserts
 * them into lesson_drafts, then updates each record's syncedAt.
 */
export async function syncDirtyDrafts(studentId: string | null, lessonId: string): Promise<void> {
  if (!studentId) return

  const allDrafts = await db.drafts.where('lessonId').equals(lessonId).toArray()
  const dirty = allDrafts.filter((d) => d.syncedAt === null || d.syncedAt < d.updatedAt)

  if (dirty.length === 0) return

  setSyncStatus('saving')

  const upsertRows = dirty.map((d) => ({
    student_id: studentId,
    lesson_id: d.lessonId,
    slide_id: d.slideId,
    prompt_id: d.promptId,
    value: d.value,
    updated_at: new Date(d.updatedAt).toISOString(),
  }))

  const { error } = await supabase.from('lesson_drafts').upsert(upsertRows)

  if (error) {
    setSyncStatus('error')
    return
  }

  const now = Date.now()
  await Promise.all(dirty.map((d) => db.drafts.update(d.id, { syncedAt: now })))

  setSyncStatus('saved')
}
