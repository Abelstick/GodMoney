import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase }       from '@/lib/supabase'
import { profileService } from '@/services/profileService'
import { readCachedUser } from '@/lib/cachedSession'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined)
  const [loading, setLoading] = useState(true)
  const ensuredRef            = useRef(false) // evita race condition

  async function ensureOnce(u) {
    if (!u || ensuredRef.current) return
    ensuredRef.current = true
    await profileService.ensureProfile(u.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let u = session?.user ?? null
      // Sin conexión y con el token caducado no se puede renovar: se muestra la app con
      // el usuario guardado en el dispositivo (solo UI) para poder registrar movimientos.
      // Supabase renueva la sesión por su cuenta al volver internet.
      const offlineFallback = !u && navigator.onLine === false
      if (offlineFallback) u = readCachedUser()
      setUser(u)
      if (!offlineFallback) await ensureOnce(u)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) ensuredRef.current = false // reset al cerrar sesión
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const { data: { session } } = await supabase.auth.getSession()
    await ensureOnce(session?.user)
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION } },
    })
    if (error) throw error
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    ensuredRef.current = false
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const TERMS_VERSION = '2026-10-16'

export const useAuth = () => useContext(AuthContext)
