/**
 * seedKitchenTech — upserts the Kitchen Technologies lesson into Supabase.
 *
 * Idempotent: uses ON CONFLICT DO UPDATE so re-running is safe.
 * Exports seedKitchenTech(client) for use in tests.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json src/scripts/seedKitchenTech.ts
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment
 * (or a .env file loaded by dotenv).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import kitchenTechnologies from '@/lessons/kitchen-technologies'
import type { Database } from '@/types/supabase'
import type { SlideConfig } from '@/lessons/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type DbClient = SupabaseClient<Database>

// ── Seed function ─────────────────────────────────────────────────────────────

/**
 * Upserts the Kitchen Technologies lesson and all its slides.
 *
 * The lesson row is matched on `slug`. Slides are matched on
 * (lesson_id, sort_order). All existing slide data is overwritten.
 *
 * @param client - An authenticated Supabase client (service-role for seeding).
 */
export async function seedKitchenTech(client: DbClient): Promise<void> {
  const lesson = kitchenTechnologies

  // ── Upsert lesson row ────────────────────────────────────────────────────────
  const { data: lessonRow, error: lessonErr } = await client
    .from('lessons')
    .upsert(
      {
        slug: lesson.id,
        title: lesson.title,
        unit_id: null,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single()

  if (lessonErr) throw new Error(`Failed to upsert lesson: ${lessonErr.message}`)
  if (!lessonRow) throw new Error('Lesson upsert returned no row')

  const lessonId = lessonRow.id

  // ── Upsert slide rows ────────────────────────────────────────────────────────
  const slideRows = lesson.slides.map((slide: SlideConfig, index: number) => ({
    lesson_id: lessonId,
    sort_order: index + 1,
    type: slide.type,
    // Store the full SlideConfig as JSONB (mapSlide in lessonLoader reconstructs it).
    config: slide as unknown as Record<string, unknown>,
  }))

  const { error: slidesErr } = await client
    .from('slides')
    .upsert(slideRows, { onConflict: 'lesson_id,sort_order' })

  if (slidesErr) throw new Error(`Failed to upsert slides: ${slidesErr.message}`)

  console.log(`[seed] Kitchen Technologies seeded: lesson ${lessonId}, ${slideRows.length} slides`)
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────────

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set')
    process.exit(1)
  }

  const client = createClient<Database>(url, key)
  await seedKitchenTech(client)
}

main().catch((err) => {
  console.error('[seed] Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
