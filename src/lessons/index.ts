import type { LessonConfig } from './types'
import kitchenTechnologies from './kitchen-technologies'

const lessons: Record<string, LessonConfig> = {
  'kitchen-technologies': kitchenTechnologies,
}

export function getLessonById(id: string): LessonConfig | undefined {
  return lessons[id]
}

export type { LessonConfig }
