import { supabase } from '../lib/supabaseClient'

/**
 * Loads habit snapshot fields for accepted friends (and shape expected by the client rank engine).
 * Requires a Postgres RPC `get_friend_rank_inputs()` (created in Supabase).
 */
export async function getFriendRankInputs() {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.rpc('get_friend_rank_inputs')
  return { data, error }
}
