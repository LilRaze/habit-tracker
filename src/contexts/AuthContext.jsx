import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { consumeSupabaseOAuthCallback, getOAuthRedirectTo } from '../utils/oauthDeepLink'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured())

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) {
        setSession(s)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) return undefined

    let listener
    let cancelled = false

    void (async () => {
      try {
        const launch = await App.getLaunchUrl()
        if (!cancelled && launch?.url) {
          await consumeSupabaseOAuthCallback(supabase, launch.url)
        }
        if (cancelled) return
        listener = await App.addListener('appUrlOpen', ({ url }) => {
          void consumeSupabaseOAuthCallback(supabase, url)
        })
      } catch (e) {
        console.warn('OAuth deep link listener failed', e)
      }
    })()

    return () => {
      cancelled = true
      listener?.remove()
    }
  }, [])

  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const redirectTo = getOAuthRedirectTo()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithGoogle,
      signOut,
      isConfigured: isSupabaseConfigured(),
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
