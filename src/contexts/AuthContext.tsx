/* eslint-disable react-refresh/only-export-components -- context files export both a provider and a hook */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
  })
  const mountedRef = useRef(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (mountedRef.current) {
      setState((s) => ({ ...s, profile: data, loading: false }))
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // Fetch the current session and hydrate state immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return
      setState((s) => ({ ...s, session }))
      if (session?.user.id) {
        void loadProfile(session.user.id)
      } else {
        setState((s) => ({ ...s, loading: false }))
      }
    })

    // Keep state in sync with Supabase auth events (sign-in, sign-out, token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return
      setState((s) => ({ ...s, session }))
      if (session?.user.id) {
        void loadProfile(session.user.id)
      } else {
        setState({ session: null, profile: null, loading: false })
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ ...state, signOut }}>{children}</AuthContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/**
 * Same as useAuth but returns null instead of throwing when no AuthProvider
 * is present. Useful for leaf components that might render in isolated tests
 * without full app wrapping.
 */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext)
}
