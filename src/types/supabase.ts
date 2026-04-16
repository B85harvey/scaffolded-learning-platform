/**
 * Hand-maintained Supabase type definitions for Phase 3.
 *
 * Replace with generated output once the schema is stable:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── Re-usable column shapes ───────────────────────────────────────────────────

type UUID = string
type Timestamptz = string

// ── Table definitions ─────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      // ── profiles ─────────────────────────────────────────────
      profiles: {
        Row: {
          id: UUID
          email: string
          display_name: string | null
          role: 'student' | 'teacher'
          created_at: Timestamptz
          updated_at: Timestamptz
        }
        Insert: {
          id: UUID
          email: string
          display_name?: string | null
          role?: 'student' | 'teacher'
          created_at?: Timestamptz
          updated_at?: Timestamptz
        }
        Update: {
          id?: UUID
          email?: string
          display_name?: string | null
          role?: 'student' | 'teacher'
          created_at?: Timestamptz
          updated_at?: Timestamptz
        }
      }

      // ── classes ──────────────────────────────────────────────
      classes: {
        Row: {
          id: UUID
          teacher_id: UUID | null
          name: string
          created_at: Timestamptz
        }
        Insert: {
          id?: UUID
          teacher_id?: UUID | null
          name: string
          created_at?: Timestamptz
        }
        Update: {
          id?: UUID
          teacher_id?: UUID | null
          name?: string
          created_at?: Timestamptz
        }
      }

      // ── class_members ────────────────────────────────────────
      class_members: {
        Row: {
          id: UUID
          class_id: UUID | null
          student_id: UUID | null
          joined_at: Timestamptz
        }
        Insert: {
          id?: UUID
          class_id?: UUID | null
          student_id?: UUID | null
          joined_at?: Timestamptz
        }
        Update: {
          id?: UUID
          class_id?: UUID | null
          student_id?: UUID | null
          joined_at?: Timestamptz
        }
      }

      // ── groups ───────────────────────────────────────────────
      groups: {
        Row: {
          id: UUID
          lesson_id: string
          class_id: UUID | null
          group_name: string
        }
        Insert: {
          id?: UUID
          lesson_id: string
          class_id?: UUID | null
          group_name: string
        }
        Update: {
          id?: UUID
          lesson_id?: string
          class_id?: UUID | null
          group_name?: string
        }
      }

      // ── group_members ────────────────────────────────────────
      group_members: {
        Row: {
          id: UUID
          group_id: UUID | null
          student_id: UUID | null
          is_scribe: boolean
        }
        Insert: {
          id?: UUID
          group_id?: UUID | null
          student_id?: UUID | null
          is_scribe?: boolean
        }
        Update: {
          id?: UUID
          group_id?: UUID | null
          student_id?: UUID | null
          is_scribe?: boolean
        }
      }

      // ── unit_assignments ─────────────────────────────────────
      unit_assignments: {
        Row: {
          id: UUID
          unit_id: string
          class_id: UUID | null
          status: 'draft' | 'open' | 'closed'
          opened_at: Timestamptz | null
          closed_at: Timestamptz | null
        }
        Insert: {
          id?: UUID
          unit_id: string
          class_id?: UUID | null
          status?: 'draft' | 'open' | 'closed'
          opened_at?: Timestamptz | null
          closed_at?: Timestamptz | null
        }
        Update: {
          id?: UUID
          unit_id?: string
          class_id?: UUID | null
          status?: 'draft' | 'open' | 'closed'
          opened_at?: Timestamptz | null
          closed_at?: Timestamptz | null
        }
      }

      // ── slide_locks ──────────────────────────────────────────
      slide_locks: {
        Row: {
          id: UUID
          lesson_id: string
          class_id: UUID | null
          slide_id: string
          locked: boolean
          updated_at: Timestamptz
        }
        Insert: {
          id?: UUID
          lesson_id: string
          class_id?: UUID | null
          slide_id: string
          locked?: boolean
          updated_at?: Timestamptz
        }
        Update: {
          id?: UUID
          lesson_id?: string
          class_id?: UUID | null
          slide_id?: string
          locked?: boolean
          updated_at?: Timestamptz
        }
      }

      // ── lesson_submissions ───────────────────────────────────
      lesson_submissions: {
        Row: {
          id: UUID
          student_id: UUID | null
          lesson_id: string
          slide_id: string
          section: string | null
          prompt_answers: Json | null
          committed_paragraph: string | null
          committed_at: Timestamptz
        }
        Insert: {
          id?: UUID
          student_id?: UUID | null
          lesson_id: string
          slide_id: string
          section?: string | null
          prompt_answers?: Json | null
          committed_paragraph?: string | null
          committed_at?: Timestamptz
        }
        Update: {
          id?: UUID
          student_id?: UUID | null
          lesson_id?: string
          slide_id?: string
          section?: string | null
          prompt_answers?: Json | null
          committed_paragraph?: string | null
          committed_at?: Timestamptz
        }
      }

      // ── lesson_drafts ────────────────────────────────────────
      lesson_drafts: {
        Row: {
          id: UUID
          student_id: UUID | null
          lesson_id: string
          slide_id: string
          prompt_id: string
          value: string | null
          updated_at: Timestamptz
        }
        Insert: {
          id?: UUID
          student_id?: UUID | null
          lesson_id: string
          slide_id: string
          prompt_id: string
          value?: string | null
          updated_at?: Timestamptz
        }
        Update: {
          id?: UUID
          student_id?: UUID | null
          lesson_id?: string
          slide_id?: string
          prompt_id?: string
          value?: string | null
          updated_at?: Timestamptz
        }
      }

      // ── lesson_progress ──────────────────────────────────────
      lesson_progress: {
        Row: {
          id: UUID
          student_id: UUID | null
          lesson_id: string
          current_slide_index: number
          status: 'not_started' | 'in_progress' | 'complete'
          updated_at: Timestamptz
        }
        Insert: {
          id?: UUID
          student_id?: UUID | null
          lesson_id: string
          current_slide_index?: number
          status?: 'not_started' | 'in_progress' | 'complete'
          updated_at?: Timestamptz
        }
        Update: {
          id?: UUID
          student_id?: UUID | null
          lesson_id?: string
          current_slide_index?: number
          status?: 'not_started' | 'in_progress' | 'complete'
          updated_at?: Timestamptz
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
