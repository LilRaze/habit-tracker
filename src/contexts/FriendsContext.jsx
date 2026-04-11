import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { isUniqueViolation } from '../services/profileService'
import * as friendService from '../services/friendService'

const FriendsContext = createContext(null)

function formatFriendOpError(error) {
  if (!error) return null
  if (isUniqueViolation(error)) return 'A pending request may already exist for this user.'
  return error.message ?? String(error)
}

export function FriendsProvider({ children }) {
  const { user } = useAuth()
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [friends, setFriends] = useState([])
  const [listsLoading, setListsLoading] = useState(false)
  const [listsError, setListsError] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [opError, setOpError] = useState(null)
  const lastQueryRef = useRef('')

  const refreshLists = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) {
      setIncoming([])
      setOutgoing([])
      setFriends([])
      setListsError(null)
      setListsLoading(false)
      return
    }
    setListsLoading(true)
    setListsError(null)
    const [inc, out, fr] = await Promise.all([
      friendService.getIncomingFriendRequests(),
      friendService.getOutgoingFriendRequests(),
      friendService.getAcceptedFriends(),
    ])
    const err = inc.error || out.error || fr.error
    if (err) setListsError(err.message ?? String(err))
    else setListsError(null)
    setIncoming(inc.data ?? [])
    setOutgoing(out.data ?? [])
    setFriends(fr.data ?? [])
    setListsLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refreshLists()
  }, [refreshLists])

  const runSearch = useCallback(async (query) => {
    setOpError(null)
    const q = String(query ?? '').trim()
    lastQueryRef.current = q
    if (!user || !isSupabaseConfigured()) {
      setSearchResults([])
      setSearchError(null)
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    const { data, error } = await friendService.searchProfilesByUsername(q)
    setSearchLoading(false)
    if (error) {
      setSearchError(error.message ?? String(error))
      setSearchResults([])
      return
    }
    setSearchResults(data ?? [])
  }, [user?.id])

  const refreshSearchIfAny = useCallback(async () => {
    const q = lastQueryRef.current
    if (q) await runSearch(q)
  }, [runSearch])

  const sendRequest = useCallback(
    async (receiverUserId) => {
      setOpError(null)
      const { error } = await friendService.sendFriendRequest(receiverUserId)
      if (error) {
        setOpError(formatFriendOpError(error))
        return { error }
      }
      await refreshLists()
      await refreshSearchIfAny()
      return { error: null }
    },
    [refreshLists, refreshSearchIfAny]
  )

  const acceptRequest = useCallback(
    async (requestId, senderId, receiverId) => {
      setOpError(null)
      const { error } = await friendService.acceptFriendRequest(requestId, senderId, receiverId)
      if (error) {
        setOpError(error.message ?? String(error))
        return { error }
      }
      await refreshLists()
      await refreshSearchIfAny()
      return { error: null }
    },
    [refreshLists, refreshSearchIfAny]
  )

  const declineRequest = useCallback(
    async (requestId) => {
      setOpError(null)
      const { error } = await friendService.declineFriendRequest(requestId)
      if (error) {
        setOpError(error.message ?? String(error))
        return { error }
      }
      await refreshLists()
      return { error: null }
    },
    [refreshLists]
  )

  const cancelRequest = useCallback(
    async (requestId) => {
      setOpError(null)
      const { error } = await friendService.cancelFriendRequest(requestId)
      if (error) {
        setOpError(error.message ?? String(error))
        return { error }
      }
      await refreshLists()
      await refreshSearchIfAny()
      return { error: null }
    },
    [refreshLists, refreshSearchIfAny]
  )

  const value = useMemo(
    () => ({
      incoming,
      outgoing,
      friends,
      listsLoading,
      listsError,
      searchResults,
      searchLoading,
      searchError,
      opError,
      setOpError,
      refreshLists,
      runSearch,
      sendRequest,
      acceptRequest,
      declineRequest,
      cancelRequest,
    }),
    [
      incoming,
      outgoing,
      friends,
      listsLoading,
      listsError,
      searchResults,
      searchLoading,
      searchError,
      opError,
      setOpError,
      refreshLists,
      runSearch,
      sendRequest,
      acceptRequest,
      declineRequest,
      cancelRequest,
    ]
  )

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
}

export function useFriends() {
  const ctx = useContext(FriendsContext)
  if (!ctx) {
    throw new Error('useFriends must be used within FriendsProvider')
  }
  return ctx
}
