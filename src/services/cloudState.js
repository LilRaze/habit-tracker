import { supabase } from '../lib/supabaseClient'
import { snapshotToCloudPayload, normalizeSnapshot } from '../utils/appStateSnapshot'

/**
 * @param {import('../utils/appStateSnapshot').AppStateSnapshot} snapshot
 */
function isMissingHabitTargetHistoryColumnError(error) {
  const msg = String(error?.message ?? error?.details ?? error?.hint ?? '')
  return /habit_target_history/i.test(msg) && /column|schema|could not find/i.test(msg)
}

export async function upsertHabitUserState(userId, snapshot) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  const payload = snapshotToCloudPayload(normalizeSnapshot(snapshot))
  const row = { user_id: userId, ...payload }
  const first = await supabase.from('habit_user_state').upsert(row, { onConflict: 'user_id' })
  if (first.error && payload.habit_target_history != null && isMissingHabitTargetHistoryColumnError(first.error)) {
    const { habit_target_history: _drop, ...rest } = payload
    return supabase.from('habit_user_state').upsert({ user_id: userId, ...rest }, { onConflict: 'user_id' })
  }
  return { error: first.error }
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
