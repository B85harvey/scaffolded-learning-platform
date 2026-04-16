import Dexie from 'dexie'

export interface DraftRecord {
  id: string // lessonId:slideId:promptId
  lessonId: string
  slideId: string
  promptId: string
  value: string
  updatedAt: number // Date.now()
  syncedAt: number | null // null = not yet synced to Supabase
}

class LessonDB extends Dexie {
  drafts!: Dexie.Table<DraftRecord, string>

  constructor() {
    super('ScaffoldedLearning')
    this.version(1).stores({
      drafts: 'id, lessonId, [lessonId+slideId]',
    })
  }
}

export const db = new LessonDB()
