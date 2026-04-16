/**
 * Unit registry — source of truth until Phase 4 moves units to Supabase.
 *
 * Each unit references lesson IDs that are keys in the lesson registry
 * (src/lessons/index.ts).
 */

export interface UnitConfig {
  id: string
  title: string
  /** Ordered list of lesson IDs belonging to this unit. */
  lessonIds: string[]
}

export const UNITS: UnitConfig[] = [
  {
    id: 'unit-2',
    title: 'Unit 2: Food and Hospitality',
    lessonIds: ['kitchen-technologies'],
  },
  {
    id: 'unit-3',
    title: 'Unit 3: Hospitality Operations',
    lessonIds: [],
  },
]

export function getUnitById(id: string): UnitConfig | undefined {
  return UNITS.find((u) => u.id === id)
}
