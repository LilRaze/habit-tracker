import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { getProfile, setUsernameForUser, isUniqueViolation } from '../services/profileService'
import { profileHasValidUsername, validateUsername } from '../utils/usernameRules'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [loadError, setLoadError] = useState(null)

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) {
      setProfile(null)
      setStatus('idle')
      setLoadError(null)
      return
    }
    setStatus('loading')
    setLoadError(null)
    const { data, error } = await getProfile(user.id)
    if (error) {
      setProfile(null)
      setLoadError(error.message ?? String(error))
      setStatus('error')
      return
    }
    setProfile(data)
    setStatus('ready')
  }, [user])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setProfile(null)
      setStatus('idle')
      setLoadError(null)
      return undefined
    }
    if (authLoading) return undefined
    if (!user) {
      setProfile(null)
      setStatus('idle')
      setLoadError(null)
      return undefined
    }
    let cancelled = false
    setStatus('loading')
    setLoadError(null)
    getProfile(user.id).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setProfile(null)
        setLoadError(error.message ?? String(error))
        setStatus('error')
        return
      }
      setProfile(data)
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading])

  const saveUsername = useCallback(
    async (rawInput) => {
      const v = validateUsername(rawInput)
      if (!v.ok) return { error: v.message }
      if (!user) return { error: 'Not signed in.' }
      if (!isSupabaseConfigured()) return { error: 'Cloud is not configured.' }

      const { data, error } = await setUsernameForUser(user.id, v.normalized)
      if (error) {
        if (isUniqueViolation(error)) {
          return { error: 'Username already in use.' }
        }
        return { error: error.message ?? 'Could not save username.' }
      }
      setProfile(data)
      setLoadError(null)
      setStatus('ready')
      return { error: null }
    },
    [user]
  )

  const needsUsernameSetup = Boolean(
    isSupabaseConfigured() &&
      user &&
      !authLoading &&
      status === 'ready' &&
      (!profile || !profileHasValidUsername(profile))
  )

  const value = useMemo(
    () => ({
      profile,
      status,
      loadError,
      refreshProfile,
      saveUsername,
      needsUsernameSetup,
    }),
    [profile, status, loadError, refreshProfile, saveUsername, needsUsernameSetup]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return ctx
}
