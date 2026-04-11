import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useFriends } from '../contexts/FriendsContext'
import { profileHasValidUsername } from '../utils/usernameRules'
import { useProfile } from '../contexts/ProfileContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

function relationshipToTarget(targetId, currentUserId, incoming, outgoing, friends) {
  if (!targetId || targetId === currentUserId) return 'self'
  if (friends.some((f) => f.id === targetId)) return 'friends'
  if (incoming.some((r) => r.sender_id === targetId)) return 'pending_incoming'
  if (outgoing.some((r) => r.receiver_id === targetId)) return 'pending_outgoing'
  return 'none'
}

function relationshipLabel(key) {
  switch (key) {
    case 'friends':
      return 'Already friends'
    case 'pending_incoming':
      return 'Pending incoming'
    case 'pending_outgoing':
      return 'Pending outgoing'
    case 'self':
      return 'You'
    default:
      return null
  }
}

export default function FriendsPanel() {
  const { user } = useAuth()
  const { profile, status: profileStatus } = useProfile()
  const {
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
    runSearch,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
  } = useFriends()

  const [query, setQuery] = useState('')
  const [rowBusy, setRowBusy] = useState(null)
  const [didSearch, setDidSearch] = useState(false)

  const canUseFriends = Boolean(
    isSupabaseConfigured() && user && profileStatus === 'ready' && profile && profileHasValidUsername(profile)
  )

  const runSearchClick = () => {
    setOpError(null)
    setDidSearch(true)
    void runSearch(query)
  }

  const wrapRow = async (key, fn) => {
    setRowBusy(key)
    try {
      await fn()
    } finally {
      setRowBusy(null)
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <section className="settings-section settings-section-friends">
        <h2 className="settings-section-title">Friends</h2>
        <p className="settings-friends-muted">Friends require cloud sign-in (configure Supabase).</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="settings-section settings-section-friends">
        <h2 className="settings-section-title">Friends</h2>
        <p className="settings-friends-muted">Sign in to add friends.</p>
      </section>
    )
  }

  if (profileStatus === 'loading') {
    return (
      <section className="settings-section settings-section-friends">
        <h2 className="settings-section-title">Friends</h2>
        <div className="settings-friends-row">
          <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
          <span>Loading profile…</span>
        </div>
      </section>
    )
  }

  if (!profile || !profileHasValidUsername(profile)) {
    return (
      <section className="settings-section settings-section-friends">
        <h2 className="settings-section-title">Friends</h2>
        <p className="settings-friends-muted">Set a username in Account before you can search or send friend requests.</p>
      </section>
    )
  }

  return (
    <section className="settings-section settings-section-friends">
      <h2 className="settings-section-title">Friends</h2>

      {listsError ? <p className="settings-friends-alert">{listsError}</p> : null}
      {opError ? (
        <p className="settings-friends-alert">
          {opError}{' '}
          <button type="button" className="settings-account-link" onClick={() => setOpError(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="settings-friends-block">
        <h3 className="settings-friends-subheading">Find by username</h3>
        <div className="settings-friends-search-row">
          <input
            className="settings-friends-input"
            type="text"
            placeholder="username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!canUseFriends}
            autoComplete="off"
          />
          <button type="button" className="settings-friends-btn" onClick={runSearchClick} disabled={!canUseFriends || searchLoading}>
            {searchLoading ? '…' : 'Search'}
          </button>
        </div>
        {searchError ? <p className="settings-friends-hint settings-friends-error">{searchError}</p> : null}
        {didSearch && searchResults.length === 0 && !searchLoading && !searchError ? (
          <p className="settings-friends-hint">No matches.</p>
        ) : null}
        <ul className="settings-friends-list">
          {searchResults.map((p) => {
            const rel = relationshipToTarget(p.id, user.id, incoming, outgoing, friends)
            const label = relationshipLabel(rel)
            const showAdd = rel === 'none' && canUseFriends
            return (
              <li key={p.id} className="settings-friends-list-item">
                <span className="settings-friends-name">{p.username ?? p.id}</span>
                {label ? <span className="settings-friends-tag">{label}</span> : null}
                {showAdd ? (
                  <button
                    type="button"
                    className="settings-friends-btn settings-friends-btn--small"
                    disabled={rowBusy === `add-${p.id}`}
                    onClick={() =>
                      wrapRow(`add-${p.id}`, async () => {
                        await sendRequest(p.id)
                      })
                    }
                  >
                    {rowBusy === `add-${p.id}` ? '…' : 'Add friend'}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="settings-friends-block">
        <h3 className="settings-friends-subheading">Incoming requests</h3>
        {listsLoading ? (
          <p className="settings-friends-hint">Loading…</p>
        ) : incoming.length === 0 ? (
          <p className="settings-friends-hint">None pending.</p>
        ) : (
          <ul className="settings-friends-list">
            {incoming.map((r) => (
              <li key={r.id} className="settings-friends-list-item settings-friends-list-item--row">
                <span className="settings-friends-name">{r.sender_profile?.username ?? r.sender_id}</span>
                <span className="settings-friends-actions">
                  <button
                    type="button"
                    className="settings-friends-btn settings-friends-btn--small"
                    disabled={rowBusy === `acc-${r.id}` || rowBusy === `dec-${r.id}`}
                    onClick={() =>
                      wrapRow(`acc-${r.id}`, async () => {
                        await acceptRequest(r.id, r.sender_id, r.receiver_id)
                      })
                    }
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="settings-friends-btn settings-friends-btn--small settings-friends-btn--ghost"
                    disabled={rowBusy === `acc-${r.id}` || rowBusy === `dec-${r.id}`}
                    onClick={() =>
                      wrapRow(`dec-${r.id}`, async () => {
                        await declineRequest(r.id)
                      })
                    }
                  >
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="settings-friends-block">
        <h3 className="settings-friends-subheading">Outgoing requests</h3>
        {listsLoading ? (
          <p className="settings-friends-hint">Loading…</p>
        ) : outgoing.length === 0 ? (
          <p className="settings-friends-hint">None pending.</p>
        ) : (
          <ul className="settings-friends-list">
            {outgoing.map((r) => (
              <li key={r.id} className="settings-friends-list-item settings-friends-list-item--row">
                <span className="settings-friends-name">{r.receiver_profile?.username ?? r.receiver_id}</span>
                <button
                  type="button"
                  className="settings-friends-btn settings-friends-btn--small settings-friends-btn--ghost"
                  disabled={rowBusy === `out-${r.id}`}
                  onClick={() =>
                    wrapRow(`out-${r.id}`, async () => {
                      await cancelRequest(r.id)
                    })
                  }
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="settings-friends-block">
        <h3 className="settings-friends-subheading">Friends</h3>
        {listsLoading ? (
          <p className="settings-friends-hint">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="settings-friends-hint">No accepted friends yet.</p>
        ) : (
          <ul className="settings-friends-list">
            {friends.map((f) => (
              <li key={f.id} className="settings-friends-list-item">
                <span className="settings-friends-name">{f.username ?? f.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
