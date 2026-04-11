import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFriendRanks } from '../hooks/useFriendRanks'
import { buildRankDisplayView } from '../utils/rankDisplayPresentation'
import SocialFriendRankDetail from '../components/SocialFriendRankDetail'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import './Social.css'

export default function Social({ rankVisualTheme = 'lol' }) {
  const { user } = useAuth()
  const { friendEntries, loading, error, refresh } = useFriendRanks()
  const [selectedFriend, setSelectedFriend] = useState(null)

  const friendsOnly = useMemo(() => {
    if (!user?.id) return []
    return friendEntries.filter((e) => e.userId !== user.id)
  }, [friendEntries, user?.id])

  const unrankedOverallView = useMemo(
    () =>
      buildRankDisplayView('Unranked', 0, {
        theme: rankVisualTheme,
        context: 'overall',
        testRankOptions: {},
      }),
    [rankVisualTheme]
  )

  if (selectedFriend) {
    return (
      <div className="screen social">
        <SocialFriendRankDetail
          friend={selectedFriend}
          rankVisualTheme={rankVisualTheme}
          onBack={() => setSelectedFriend(null)}
        />
      </div>
    )
  }

  return (
    <div className="screen social">
      <div className="social-header">
        <h1>Social</h1>
        {user && isSupabaseConfigured() ? (
          <button type="button" className="social-refresh" onClick={() => void refresh()} disabled={loading}>
            {loading ? '…' : 'Refresh'}
          </button>
        ) : null}
      </div>

      {!isSupabaseConfigured() ? (
        <p className="social-muted">Cloud is not configured.</p>
      ) : !user ? (
        <p className="social-muted">Sign in to see your friends here.</p>
      ) : error ? (
        <p className="social-error">{error}</p>
      ) : friendsOnly.length === 0 && !loading ? (
        <p className="social-muted">No friends yet. Send requests from Settings.</p>
      ) : (
        <ul className="social-list">
          {friendsOnly.map((row) => {
            const name = row.username ?? row.userId
            if (!row.hasSyncedData || !row.overallForDisplay) {
              return (
                <li key={row.userId}>
                  <button type="button" className="social-row" onClick={() => setSelectedFriend(row)}>
                    <span
                      className={`${unrankedOverallView.emblemWrapClassName} social-row-emblem rank-emblem-optical-nudge`}
                    >
                      <img src={unrankedOverallView.emblemSrc} alt="" className={unrankedOverallView.emblemImgClassName} />
                    </span>
                    <span className="social-row-text">
                      <span className="social-row-name">{name}</span>
                      <span className="social-row-sub">No synced data yet</span>
                    </span>
                  </button>
                </li>
              )
            }
            const view = buildRankDisplayView(row.overallForDisplay.rank, row.overallForDisplay.lp, {
              theme: rankVisualTheme,
              context: 'overall',
              testRankOptions: { apexDivision: row.testRankOverride?.apexDivision },
            })
            return (
              <li key={row.userId}>
                <button type="button" className="social-row" onClick={() => setSelectedFriend(row)}>
                  <span className={`${view.emblemWrapClassName} social-row-emblem rank-emblem-optical-nudge`}>
                    <img src={view.emblemSrc} alt="" className={view.emblemImgClassName} />
                  </span>
                  <span className="social-row-text">
                    <span className="social-row-name">{name}</span>
                    <span className="social-row-sub">{view.displayLabel}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
