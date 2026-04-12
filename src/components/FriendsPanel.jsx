import { useState } from 'react'
import { Loader2, Search, Inbox, Send, Users } from 'lucide-react'
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

function FriendsSectionShell({ children }) {
  return (
    <section className="settings-section settings-section-friends">
      <header className="settings-friends-panel-head">
        <h2 className="settings-section-title settings-friends-title">Friends</h2>
      </header>
      {children}
    </section>
  )
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
      <FriendsSectionShell>
        <div className="settings-friends-card settings-friends-card--message">
          <p className="settings-friends-muted">Friends require cloud sign-in (configure Supabase).</p>
        </div>
      </FriendsSectionShell>
    )
  }

  if (!user) {
    return (
      <FriendsSectionShell>
        <div className="settings-friends-card settings-friends-card--message">
          <p className="settings-friends-muted">Sign in to add friends.</p>
        </div>
      </FriendsSectionShell>
    )
  }

  if (profileStatus === 'loading') {
    return (
      <FriendsSectionShell>
        <div className="settings-friends-card settings-friends-card--message">
          <div className="settings-friends-empty settings-friends-empty--loading" role="status">
            <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
            <span>Loading profile…</span>
          </div>
        </div>
      </FriendsSectionShell>
    )
  }

  if (!profile || !profileHasValidUsername(profile)) {
    return (
      <FriendsSectionShell>
        <div className="settings-friends-card settings-friends-card--message">
          <p className="settings-friends-muted">Set a username in Account before you can search or send friend requests.</p>
        </div>
      </FriendsSectionShell>
    )
  }

  return (
    <FriendsSectionShell>
      {listsError ? <p className="settings-friends-alert">{listsError}</p> : null}
      {opError ? (
        <p className="settings-friends-alert">
          {opError}{' '}
          <button type="button" className="settings-account-link" onClick={() => setOpError(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="settings-friends-stack">
        <article className="settings-friends-card" aria-labelledby="friends-find-heading">
          <h3 id="friends-find-heading" className="settings-friends-card-heading">
            <Search size={16} strokeWidth={2} className="settings-friends-card-icon" aria-hidden />
            <span>Find by username</span>
          </h3>
          <div className="settings-friends-card-body">
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
              <button
                type="button"
                className="settings-friends-btn settings-friends-btn--search"
                onClick={runSearchClick}
                disabled={!canUseFriends || searchLoading}
              >
                {searchLoading ? (
                  <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
                ) : (
                  'Search'
                )}
              </button>
            </div>
            {searchError ? (
              <p className="settings-friends-card-hint settings-friends-error">{searchError}</p>
            ) : null}
            {didSearch && searchResults.length === 0 && !searchLoading && !searchError ? (
              <div className="settings-friends-empty" role="status">
                No matches.
              </div>
            ) : null}
            <ul className="settings-friends-list">
              {searchResults.map((p) => {
                const rel = relationshipToTarget(p.id, user.id, incoming, outgoing, friends)
                const label = relationshipLabel(rel)
                const showAdd = rel === 'none' && canUseFriends
                return (
                  <li key={p.id} className="settings-friends-list-item">
                    <div className="settings-friends-list-main">
                      <span className="settings-friends-name">{p.username ?? p.id}</span>
                      {label ? <span className="settings-friends-chip">{label}</span> : null}
                    </div>
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
        </article>

        <article className="settings-friends-card" aria-labelledby="friends-incoming-heading">
          <h3 id="friends-incoming-heading" className="settings-friends-card-heading">
            <Inbox size={16} strokeWidth={2} className="settings-friends-card-icon" aria-hidden />
            <span>Incoming requests</span>
          </h3>
          <div className="settings-friends-card-body settings-friends-card-body--flush">
            {listsLoading ? (
              <div className="settings-friends-empty settings-friends-empty--loading" role="status">
                <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
                <span>Loading…</span>
              </div>
            ) : incoming.length === 0 ? (
              <div className="settings-friends-empty" role="status">
                None pending.
              </div>
            ) : (
              <ul className="settings-friends-list settings-friends-list--inset">
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
        </article>

        <article className="settings-friends-card" aria-labelledby="friends-outgoing-heading">
          <h3 id="friends-outgoing-heading" className="settings-friends-card-heading">
            <Send size={16} strokeWidth={2} className="settings-friends-card-icon" aria-hidden />
            <span>Outgoing requests</span>
          </h3>
          <div className="settings-friends-card-body settings-friends-card-body--flush">
            {listsLoading ? (
              <div className="settings-friends-empty settings-friends-empty--loading" role="status">
                <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
                <span>Loading…</span>
              </div>
            ) : outgoing.length === 0 ? (
              <div className="settings-friends-empty" role="status">
                None pending.
              </div>
            ) : (
              <ul className="settings-friends-list settings-friends-list--inset">
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
        </article>

        <article className="settings-friends-card" aria-labelledby="friends-list-heading">
          <h3 id="friends-list-heading" className="settings-friends-card-heading">
            <Users size={16} strokeWidth={2} className="settings-friends-card-icon" aria-hidden />
            <span>Friends</span>
          </h3>
          <div className="settings-friends-card-body settings-friends-card-body--flush">
            {listsLoading ? (
              <div className="settings-friends-empty settings-friends-empty--loading" role="status">
                <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
                <span>Loading…</span>
              </div>
            ) : friends.length === 0 ? (
              <div className="settings-friends-empty" role="status">
                No accepted friends yet.
              </div>
            ) : (
              <ul className="settings-friends-list settings-friends-list--inset">
                {friends.map((f) => (
                  <li key={f.id} className="settings-friends-list-item">
                    <span className="settings-friends-name">{f.username ?? f.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </div>
    </FriendsSectionShell>
  )
}
