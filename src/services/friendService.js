import { supabase } from '../lib/supabaseClient'

function assertSupabase() {
  if (!supabase) return new Error('Supabase not configured')
  return null
}

async function getSessionUserId() {
  const cfg = assertSupabase()
  if (cfg) return { userId: null, error: cfg }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) return { userId: null, error }
  if (!user) return { userId: null, error: new Error('Not signed in') }
  return { userId: user.id, error: null }
}

/** Narrow query to safe username chars to keep ilike pattern simple. */
function sanitizeUsernameSearchFragment(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
}

/**
 * Case-insensitive partial match on profiles.username; excludes current user.
 * @returns {{ data: Array<{ id: string, username: string | null }>, error: Error | null }}
 */
export async function searchProfilesByUsername(rawQuery) {
  const cfg = assertSupabase()
  if (cfg) return { data: [], error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { data: [], error: ue }

  const safe = sanitizeUsernameSearchFragment(rawQuery)
  if (safe.length < 1) return { data: [], error: null }

  const pattern = `%${safe}%`
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .neq('id', userId)
    .ilike('username', pattern)
    .limit(25)

  return { data: data ?? [], error }
}

export async function sendFriendRequest(receiverUserId) {
  const cfg = assertSupabase()
  if (cfg) return { error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { error: ue }
  if (userId === receiverUserId) return { error: new Error('Cannot send a friend request to yourself.') }

  const { error } = await supabase.from('friend_requests').insert({
    sender_id: userId,
    receiver_id: receiverUserId,
    status: 'pending',
  })
  return { error }
}

async function fetchProfilesByIds(ids) {
  if (!supabase) return new Map()
  const uniq = [...new Set(ids)].filter(Boolean)
  if (uniq.length === 0) return new Map()
  const { data, error } = await supabase.from('profiles').select('id, username').in('id', uniq)
  if (error) throw error
  return new Map((data ?? []).map((p) => [p.id, p]))
}

/**
 * @returns {{ data: Array<object>, error: Error | null }}
 */
export async function getIncomingFriendRequests() {
  const cfg = assertSupabase()
  if (cfg) return { data: [], error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { data: [], error: ue }

  const { data: reqs, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error }
  const list = reqs ?? []
  if (list.length === 0) return { data: [], error: null }

  try {
    const pmap = await fetchProfilesByIds(list.map((r) => r.sender_id))
    const data = list.map((r) => ({
      ...r,
      sender_profile: pmap.get(r.sender_id) ?? { id: r.sender_id, username: null },
    }))
    return { data, error: null }
  } catch (e) {
    return { data: [], error: e }
  }
}

export async function getOutgoingFriendRequests() {
  const cfg = assertSupabase()
  if (cfg) return { data: [], error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { data: [], error: ue }

  const { data: reqs, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status, created_at')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error }
  const list = reqs ?? []
  if (list.length === 0) return { data: [], error: null }

  try {
    const pmap = await fetchProfilesByIds(list.map((r) => r.receiver_id))
    const data = list.map((r) => ({
      ...r,
      receiver_profile: pmap.get(r.receiver_id) ?? { id: r.receiver_id, username: null },
    }))
    return { data, error: null }
  } catch (e) {
    return { data: [], error: e }
  }
}

/**
 * Accepts a friend request via server RPC (updates request + creates friendships).
 * `senderId` / `receiverId` are still validated client-side so the UI cannot accept on behalf of the wrong user.
 */
export async function acceptFriendRequest(requestId, senderId, receiverId) {
  const cfg = assertSupabase()
  if (cfg) return { error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { error: ue }
  if (userId !== receiverId) return { error: new Error('Not authorized to accept this request.') }

  const { data: row, error: fetchErr } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr }
  if (!row) return { error: new Error('Request not found.') }
  if (row.sender_id !== senderId || row.receiver_id !== receiverId) {
    return { error: new Error('Request no longer matches this action.') }
  }

  if (row.status !== 'pending' && row.status !== 'accepted') {
    return { error: new Error('This request is no longer pending.') }
  }

  const { error } = await supabase.rpc('accept_friend_request', { p_request_id: requestId })
  return { error }
}

export async function declineFriendRequest(requestId) {
  const cfg = assertSupabase()
  if (cfg) return { error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { error: ue }

  const { data: row, error: fe } = await supabase
    .from('friend_requests')
    .select('receiver_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (fe) return { error: fe }
  if (!row) return { error: new Error('Request not found.') }
  if (row.receiver_id !== userId) return { error: new Error('Not authorized to decline this request.') }
  if (row.status !== 'pending') return { error: null }

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('status', 'pending')

  return { error }
}

export async function cancelFriendRequest(requestId) {
  const cfg = assertSupabase()
  if (cfg) return { error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { error: ue }

  const { data: row, error: fe } = await supabase
    .from('friend_requests')
    .select('sender_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (fe) return { error: fe }
  if (!row) return { error: new Error('Request not found.') }
  if (row.sender_id !== userId) return { error: new Error('Not authorized to cancel this request.') }
  if (row.status !== 'pending') return { error: null }

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'canceled' })
    .eq('id', requestId)
    .eq('status', 'pending')

  return { error }
}

export async function getAcceptedFriends() {
  const cfg = assertSupabase()
  if (cfg) return { data: [], error: cfg }
  const { userId, error: ue } = await getSessionUserId()
  if (ue) return { data: [], error: ue }

  const { data: links, error } = await supabase.from('friendships').select('friend_id').eq('user_id', userId)

  if (error) return { data: [], error }
  const ids = [...new Set((links ?? []).map((l) => l.friend_id))]
  if (ids.length === 0) return { data: [], error: null }

  const { data: profs, error: perr } = await supabase.from('profiles').select('id, username').in('id', ids)
  if (perr) return { data: [], error: perr }

  const list = profs ?? []
  list.sort((a, b) => String(a.username ?? '').localeCompare(String(b.username ?? '')))
  return { data: list, error: null }
}
