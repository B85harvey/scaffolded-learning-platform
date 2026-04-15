import type { ScaffoldConfig } from '@/lib/scaffold'

export type Section =
  | 'orientation'
  | 'aim'
  | 'issues'
  | 'decision'
  | 'justification'
  | 'implementation'
  | 'references'
  | 'review'

export interface Image {
  src: string
  alt: string
}

export interface McqOption {
  id: string
  text: string
  correct?: boolean
  explanation?: string
}

export interface CommittedParagraph {
  section: Section
  text: string
  warnings: string[]
  committedAt: number
}

export type SlideAnswers =
  | { kind: 'text'; values: Record<string, string> }
  | { kind: 'table'; rows: Array<Record<string, string>> }

export type SlideConfig =
  | {
      id: string
      type: 'content'
      section: Section
      title?: string
      body: string
      image?: Image
    }
  | {
      id: string
      type: 'mcq'
      section: Section
      question: string
      options: McqOption[]
      variant: 'self' | 'class'
    }
  | {
      id: string
      type: 'scaffold'
      section: Section
      mode: 'framed' | 'guided' | 'freeform-table'
      config: ScaffoldConfig
    }
  | {
      id: string
      type: 'review'
      section: 'review'
    }

export interface LessonConfig {
  id: string
  title: string
  scribe: string
  slides: SlideConfig[]
}
