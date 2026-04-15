import { supabase } from '@/lib/supabase'

/**
 * Send a magic link to the given email address.
 * The user will be redirected to /auth/callback after clicking the link.
 */
export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${import.meta.env.APP_URL}/auth/callback`,
    },
  })
  if (error) throw error
}

/**
 * Sign the current user out and clear the local session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
