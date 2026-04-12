import { Capacitor } from '@capacitor/core'

/** Must match Supabase redirect allow-list and Android intent-filter host. */
export const NATIVE_OAUTH_REDIRECT = 'com.lilraze.habittracker://login-callback'

export function isNativeCapacitor() {
  return Capacitor.isNativePlatform()
}

export function getOAuthRedirectTo() {
  if (typeof window === 'undefined') return NATIVE_OAUTH_REDIRECT
  return isNativeCapacitor() ? NATIVE_OAUTH_REDIRECT : `${window.location.origin}/`
}

/**
 * Completes Supabase OAuth from a native deep link (PKCE `code` or legacy hash tokens).
 * @param {import('@supabase/supabase-js').SupabaseClient | null} supabase
 * @param {string} urlString
 * @returns {Promise<boolean>} true if the URL was our callback and was processed (including errors)
 */
export async function consumeSupabaseOAuthCallback(supabase, urlString) {
  if (!supabase || !urlString || typeof urlString !== 'string') return false

  let url
  try {
    url = new URL(urlString)
  } catch {
    return false
  }

  const isNativeCallback =
    url.protocol === 'com.lilraze.habittracker:' && url.hostname === 'login-callback'
  if (!isNativeCallback) return false

  const hashParams =
    url.hash && url.hash.length > 1 ? new URLSearchParams(url.hash.slice(1)) : new URLSearchParams()
  const q = url.searchParams
  const pick = (key) => q.get(key) ?? hashParams.get(key)

  const oauthError = pick('error')
  const errorDesc = pick('error_description')
  if (oauthError || errorDesc) {
    console.warn('[oauth]', oauthError ?? '', errorDesc ?? '')
    return true
  }

  const code = pick('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.warn('[oauth] exchangeCodeForSession', error.message)
    return true
  }

  const access_token = pick('access_token')
  const refresh_token = pick('refresh_token')
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) console.warn('[oauth] setSession', error.message)
    return true
  }

  return false
}
