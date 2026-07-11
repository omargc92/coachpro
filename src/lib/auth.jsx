// ============================================================
// Contexto de sesión del COACH (Supabase Auth, email/password)
// ============================================================
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => { setSession(data.session) })
      .catch(() => {})
      .finally(() => setLoading(false))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user || null,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    // emailRedirectTo: el link de confirmación vuelve al origen donde se registró
    // (prod: coachpro.umbraldigital.com.mx). Debe estar en el uri_allow_list de Supabase Auth.
    signUp: (email, password) =>
      supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      }),
    signOut: () => supabase.auth.signOut()
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
