import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoMode, supabase } from './supabase'

export interface AppUser {
  id: string
  email?: string
}

interface AuthCtx {
  user: AppUser | null
  loading: boolean
  signIn(email: string, password: string): Promise<void>
  /** اگر true برگردد یعنی باید ایمیل تأیید شود */
  signUp(email: string, password: string): Promise<{ needsConfirm: boolean }>
  magicLink(email: string): Promise<void>
  signOut(): Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)
const DEMO_USER: AppUser = { id: 'demo', email: 'حالت نمایشی' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(demoMode ? DEMO_USER : null)
  const [loading, setLoading] = useState(!demoMode)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email } : null)
      setLoading(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email, password) {
        if (!supabase) return { needsConfirm: false }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        return { needsConfirm: !data.session }
      },
      async magicLink(email) {
        if (!supabase) return
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
      },
      async signOut() {
        if (!supabase) return
        await supabase.auth.signOut()
      },
    }),
    [user, loading],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
