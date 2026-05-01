import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase }       from '@/lib/supabase'
import { profileService } from '@/services/profileService'

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
      const u = session?.user ?? null
      setUser(u)
      await ensureOnce(u)
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
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    ensuredRef.current = false
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
