/**
 * lessonLoader — loads a LessonConfig from Supabase.
 *
 * Queries the `lessons` and `slides` tables by lesson slug, reconstructs the
 * SlideConfig array from the stored JSONB, and returns a LessonConfig ready
 * for the reducer.
 *
 * If Supabase is unavailable or the lesson is not found in the database,
 * falls back to the hardcoded lesson registry and logs a warning so dev/test
 * environments continue to work without a real database.
 */
import { supabase } from '@/lib/supabase'
import kitchenTechnologies from '@/lessons/kitchen-technologies'
import type { LessonConfig, SlideConfig } from '@/lessons/types'
import type { Json } from '@/types/supabase'

// ── Fallback registry ─────────────────────────────────────────────────────────
// Keep in sync with src/lessons/index.ts. This is a deliberate duplication to
// avoid a circular import (index.ts would otherwise import from lessonLoader).

const HARDCODED: Record<string, LessonConfig> = {
  'kitchen-technologies': kitchenTechnologies,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cast a JSONB config cell back to a typed SlideConfig. */
function mapSlide(row: { type: string; config: Json; sort_order: number }): SlideConfig {
  // The seed script stores the entire SlideConfig as the config JSON.
  // Reconstruct by spreading config and ensuring type is set from the column.
  const base = row.config as Record<string, unknown>
  return { ...base, type: row.type } as SlideConfig
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load a lesson by its slug (e.g. 'kitchen-technologies').
 *
 * Tries Supabase first. On any error — network failure, missing row, or RLS
 * rejection — falls back to the hardcoded registry with a console warning.
 *
 * Throws only if the lesson is not found in either source.
 */
export async function loadLesson(lessonId: string): Promise<LessonConfig> {
  try {
    const { data: lessonRow, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, slug, unit_id, title')
      .eq('slug', lessonId)
      .maybeSingle()

    if (lessonErr) throw lessonErr
    if (!lessonRow) throw new Error(`Lesson slug '${lessonId}' not found in database`)

    const { data: slideRows, error: slideErr } = await supabase
      .from('slides')
      .select('type, config, sort_order')
      .eq('lesson_id', lessonRow.id)
      .order('sort_order', { ascending: true })

    if (slideErr) throw slideErr

    const slides = (slideRows ?? []).map(mapSlide)

    if (slides.length === 0) {
      throw new Error(`No slides found for lesson '${lessonId}' in database`)
    }

    return {
      id: lessonRow.slug,
      title: lessonRow.title,
      scribe: '',
      slides,
    }
  } catch (err) {
    const hardcoded = HARDCODED[lessonId]
    if (hardcoded) {
      console.warn(
        `[lessonLoader] Falling back to hardcoded lesson '${lessonId}'. Reason:`,
        err instanceof Error ? err.message : err
      )
      return hardcoded
    }
    throw new Error(`Lesson '${lessonId}' not found in Supabase or hardcoded registry`)
  }
}
