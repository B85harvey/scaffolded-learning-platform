/**
 * Completion calculation helpers.
 *
 * These query Supabase to derive per-unit and per-lesson progress for a
 * given student. The lesson and unit registries are the source of truth for
 * structure; Supabase provides the student's saved state.
 */
import { supabase } from '@/lib/supabase'
import { getLessonById } from '@/lessons'
import { getUnitById } from '@/lessons/units'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the set of distinct section names that have at least one scaffold
 * slide in the given unit. Used as the denominator for completion %.
 */
function scaffoldSectionsForUnit(unitId: string): Set<string> {
  const unit = getUnitById(unitId)
  const sections = new Set<string>()
  if (!unit) return sections

  for (const lessonId of unit.lessonIds) {
    const lesson = getLessonById(lessonId)
    if (!lesson) continue
    for (const slide of lesson.slides) {
      if (slide.type === 'scaffold') {
        sections.add(slide.section)
      }
    }
  }
  return sections
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a completion percentage (0–100) for the given student and unit.
 *
 * Numerator:   distinct scaffold sections the student has committed.
 * Denominator: total distinct scaffold sections across all lessons in the unit.
 *
 * Returns 0 when the unit has no scaffold sections or no submissions.
 */
export async function calcUnitCompletion(studentId: string, unitId: string): Promise<number> {
  const unit = getUnitById(unitId)
  if (!unit || unit.lessonIds.length === 0) return 0

  const totalSections = scaffoldSectionsForUnit(unitId)
  if (totalSections.size === 0) return 0

  const { data } = await supabase
    .from('lesson_submissions')
    .select('section, committed_paragraph')
    .eq('student_id', studentId)
    .in('lesson_id', unit.lessonIds)

  const committed = new Set(
    (data ?? []).filter((r) => r.committed_paragraph && r.section).map((r) => r.section as string)
  )

  return Math.round((committed.size / totalSections.size) * 100)
}

// ── Lesson-level status ───────────────────────────────────────────────────────

export type LessonStatusResult = {
  status: 'not_started' | 'in_progress' | 'complete'
  currentSlideIndex: number
}

/**
 * Returns the lesson status and current slide index for a student.
 * If no lesson_progress row exists the lesson is considered not started.
 */
export async function calcLessonStatus(
  studentId: string,
  lessonId: string
): Promise<LessonStatusResult> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('status, current_slide_index')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  return {
    status: data?.status ?? 'not_started',
    currentSlideIndex: data?.current_slide_index ?? 0,
  }
}
