import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { getFriendRankInputs } from '../services/friendRankService'
import { mapRpcRowToLeaderboardEntry } from '../utils/friendRankRow'

function normalizeRpcData(data) {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.rows)) return data.rows
  return [data]
}

/**
 * Fetches friend rank input rows from Supabase RPC and maps them to leaderboard entries.
 */
export function useFriendRanks() {
  const { user } = useAuth()
  const [rawRows, setRawRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) {
      setRawRows([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await getFriendRankInputs()
    setLoading(false)
    if (rpcError) {
      setError(rpcError.message ?? String(rpcError))
      setRawRows([])
      return
    }
    setRawRows(normalizeRpcData(data))
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const friendEntries = useMemo(() => {
    return rawRows.map(mapRpcRowToLeaderboardEntry).filter(Boolean)
  }, [rawRows])

  return {
    friendEntries,
    loading,
    error,
    refresh,
  }
}
