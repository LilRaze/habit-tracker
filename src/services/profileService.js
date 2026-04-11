import { supabase } from '../lib/supabaseClient'

/**
 * Reads `public.profiles` (expects `id` = auth user id).
 * Add a nullable `username text` column (unique) on the server when wiring this up.
 */

export async function getProfile(userId) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return { data, error }
}

export async function createProfile({ userId, username }) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select()
    .maybeSingle()
  return { data, error }
}

export async function updateUsername(userId, username) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
    .select()
    .maybeSingle()
  return { data, error }
}

/** Prefer update (row often exists from signup trigger); insert if no row matched. */
export async function setUsernameForUser(userId, username) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data: updated, error: updateError } = await updateUsername(userId, username)
  if (updateError) return { data: null, error: updateError }
  if (updated) return { data: updated, error: null }
  return createProfile({ userId, username })
}

export function isUniqueViolation(error) {
  if (!error) return false
  const code = error.code
  if (code === '23505') return true
  const msg = String(error.message ?? '').toLowerCase()
  return msg.includes('unique') || msg.includes('duplicate')
}
