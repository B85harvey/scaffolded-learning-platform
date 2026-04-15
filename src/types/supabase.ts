/**
 * Stub type definition for the Supabase database schema.
 *
 * Replace this file with the generated output from:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
 *
 * Do not hand-edit once the real schema is in place.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          role: 'student' | 'teacher'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: 'student' | 'teacher'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: 'student' | 'teacher'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
