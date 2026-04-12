import { supabase } from '../lib/supabaseClient'

/**
 * Loads habit snapshot fields for accepted friends (and shape expected by the client rank engine).
 * Requires a Postgres RPC `get_friend_rank_inputs()` (created in Supabase). The RPC should expose
 * `habit_user_state` fields used for rank, including `habit_target_history` (weekly target schedule).
 */
export async function getFriendRankInputs() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.rpc('get_friend_rank_inputs')
  return { data, error }
}
