import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  passwordRecovery: boolean
  finishPasswordRecovery: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    async function acceptAuthorizedSession(candidate: Session | null) {
      if (!mounted || !supabase || !candidate) {
        if (mounted) { setSession(null); setLoading(false) }
        return
      }
      const { data: authorized, error } = await supabase.rpc('is_authorized_admin')
      if (!mounted) return
      if (error || !authorized) {
        setSession(null)
        setLoading(false)
        await supabase.auth.signOut()
        return
      }
      setSession(candidate)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      void acceptAuthorizedSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setLoading(false)
        return
      }
      window.setTimeout(() => { void acceptAuthorizedSession(nextSession) }, 0)
    })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    passwordRecovery,
    finishPasswordRecovery: () => setPasswordRecovery(false),
    signOut: async () => { if (supabase) await supabase.auth.signOut() },
  }), [session, loading, passwordRecovery])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}
