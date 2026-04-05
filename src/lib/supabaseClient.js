import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase browser client (anon key + RLS). Null when env is missing (local-only mode).
 */
export const supabase =
  typeof url === 'string' &&
  url.length > 0 &&
  typeof anonKey === 'string' &&
  anonKey.length > 0
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

export function isSupabaseConfigured() {
  return supabase != null
}
