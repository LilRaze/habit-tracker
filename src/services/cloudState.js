import { supabase } from '../lib/supabaseClient'
import { snapshotToCloudPayload, normalizeSnapshot } from '../utils/appStateSnapshot'

/**
 * @param {import('../utils/appStateSnapshot').AppStateSnapshot} snapshot
 */
export async function upsertHabitUserState(userId, snapshot) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  const payload = snapshotToCloudPayload(normalizeSnapshot(snapshot))
  const { error } = await supabase.from('habit_user_state').upsert(
    {
      user_id: userId,
      ...payload,
    },
    { onConflict: 'user_id' }
  )
  return { error }
}

export async function fetchHabitUserState(userId) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('habit_user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}
