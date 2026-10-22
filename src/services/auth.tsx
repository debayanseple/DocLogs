import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { friendlyAuthError } from '../utils/errors'
import type { User, Session } from '@supabase/supabase-js'

interface AuthCtx {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isConfigured: boolean
  profileName: string | null
  /**
   * Update the signed-in user's display name and/or sign-in email.
   *
   * The name is stored in auth metadata and applies immediately. The email
   * is the login identity: Supabase sends a confirmation link to the new
   * address and only swaps it over once that link is opened, so
   * `pendingEmail` is set to tell the user what to expect.
   */
  updateProfile: (input: {
    fullName?: string
    email?: string
    currentPassword?: string
  }) => Promise<{ error: string | null; pendingEmail: string | null }>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn: AuthCtx['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'Sign-in is currently unavailable. Please try again later.' }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error ? friendlyAuthError(error.message) : null }
    } catch {
      return { error: friendlyAuthError('network') }
    }
  }
  const signUp: AuthCtx['signUp'] = async (email, password, fullName) => {
    if (!supabase) return { error: 'Sign-up is currently unavailable. Please try again later.' }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName?.trim() || null, display_name: fullName?.trim() || null } },
      })
      return { error: error ? friendlyAuthError(error.message) : null }
    } catch {
      return { error: friendlyAuthError('network') }
    }
  }
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  const updateProfile: AuthCtx['updateProfile'] = async ({ fullName, email, currentPassword }) => {
    if (!supabase) return { error: 'Your account is currently unavailable. Please try again later.', pendingEmail: null }
    const trimmedName = fullName?.trim()
    const nextEmail = email?.trim().toLowerCase()
    const currentEmail = user?.email ?? ''

    const wantsName = typeof trimmedName === 'string' && trimmedName.length > 0
    const wantsEmail = !!nextEmail && nextEmail !== currentEmail.toLowerCase()

    if (!wantsName && !wantsEmail) return { error: null, pendingEmail: null }

    try {
      // Changing the login email is a sensitive action — require the current
      // password so a hijacked session cannot silently take over the account.
      if (wantsEmail) {
        if (!currentPassword) {
          return { error: 'Please enter your current password to change your email.', pendingEmail: null }
        }
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        })
        if (reauthError) {
          return { error: 'Your current password is incorrect.', pendingEmail: null }
        }
      }

      if (wantsName) {
        const { error: nameError } = await supabase.auth.updateUser({
          data: { full_name: trimmedName, display_name: trimmedName },
        })
        if (nameError) {
          return { error: friendlyAuthError(nameError.message), pendingEmail: null }
        }
      }

      if (wantsEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail })
        if (emailError) {
          return {
            error: friendlyAuthError(emailError.message),
            pendingEmail: null,
          }
        }
        // The new address is not active until the link in the confirmation
        // email is opened.
        return {
          error: null,
          pendingEmail: nextEmail,
        }
      }

      return { error: null, pendingEmail: null }
    } catch {
      return { error: friendlyAuthError('network'), pendingEmail: null }
    }
  }

  const profileName = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.display_name as string) || null

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        isConfigured: isSupabaseConfigured,
        profileName,
        updateProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth missing')
  return c
}
