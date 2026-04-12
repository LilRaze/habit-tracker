import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { useFriendRanks } from '../hooks/useFriendRanks'
import { buildRankDisplayView } from '../utils/rankDisplayPresentation'
import { buildSelfLeaderboardEntry } from '../utils/friendRankRow'
import { computeLeaderboardHabitRow } from '../utils/leaderboardHabit'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import './FriendsRankLeaderboard.css'

function mergeOverallRows(
  user,
  profile,
  friendEntries,
  completions,
  targetDays,
  activeHabits,
  habitTargetHistory,
  testRankOverride
) {
  if (!user?.id) return []
  const displayName =
    profile && typeof profile.username === 'string' && profile.username.trim() !== ''
      ? profile.username
      : user.email ?? 'You'

  const selfEntry = buildSelfLeaderboardEntry(
    user.id,
    displayName,
    completions,
    targetDays,
    activeHabits,
    habitTargetHistory,
    testRankOverride
  )
  if (!selfEntry) return []

  const others = friendEntries.filter((e) => e.userId !== user.id)
  const merged = [selfEntry, ...others]
  merged.sort((a, b) => {
    if (b.progressSort !== a.progressSort) return b.progressSort - a.progressSort
    return String(a.username ?? '').localeCompare(String(b.username ?? ''))
  })
  return merged
}

export default function FriendsRankLeaderboard({
  completions,
  targetDays,
  activeHabits,
  habitTargetHistory,
  testRankOverride,
  rankVisualTheme = 'lol',
  timeOffsetTick = 0,
  mode = 'overall',
  selectedHabit = null,
  title = 'Friends leaderboard',
  subtitle = null,
  embedded = false,
  omitTitle = false,
}) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { friendEntries, loading, error, refresh } = useFriendRanks()

  const mergedOverall = useMemo(
    () =>
      mergeOverallRows(
        user,
        profile,
        friendEntries,
        completions,
        targetDays,
        activeHabits,
        habitTargetHistory,
        testRankOverride
      ),
    [
      user?.id,
      user?.email,
      profile,
      friendEntries,
      completions,
      targetDays,
      activeHabits,
      habitTargetHistory,
      testRankOverride,
      timeOffsetTick,
    ]
  )

  const displayRows = useMemo(() => {
    if (mode !== 'habit' || !selectedHabit) {
      return mergedOverall.map((row) => ({ kind: 'overall', row }))
    }

    const augmented = mergedOverall.map((row) => {
      const habitExtras = computeLeaderboardHabitRow(row, selectedHabit, rankVisualTheme)
      return { kind: 'habit', row: { ...row, ...habitExtras } }
    })

    augmented.sort((a, b) => {
      const ar = a.row
      const br = b.row
      if (ar.habitRanked !== br.habitRanked) return ar.habitRanked ? -1 : 1
      if (br.habitProgressSort !== ar.habitProgressSort) return br.habitProgressSort - ar.habitProgressSort
      return String(ar.username ?? '').localeCompare(String(br.username ?? ''))
    })
    return augmented
  }, [mergedOverall, mode, selectedHabit, rankVisualTheme])

  if (!isSupabaseConfigured()) {
    return (
      <section
        className={`friends-lb ${embedded ? 'friends-lb--embedded' : ''}`}
        aria-labelledby={omitTitle ? undefined : 'friends-lb-title'}
      >
        {!omitTitle ? (
          <h2 id="friends-lb-title" className="friends-lb-title">
            {title}
          </h2>
        ) : null}
        <p className="friends-lb-muted">Cloud is not configured.</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section
        className={`friends-lb ${embedded ? 'friends-lb--embedded' : ''}`}
        aria-labelledby={omitTitle ? undefined : 'friends-lb-title'}
      >
        {!omitTitle ? (
          <h2 id="friends-lb-title" className="friends-lb-title">
            {title}
          </h2>
        ) : null}
        <p className="friends-lb-muted">Sign in to compare ranks with friends.</p>
      </section>
    )
  }

  const friendCount = friendEntries.filter((e) => e.userId !== user.id).length

  return (
    <section
      className={`friends-lb ${embedded ? 'friends-lb--embedded' : ''}`}
      aria-labelledby={omitTitle ? undefined : 'friends-lb-title'}
    >
      <div className="friends-lb-header">
        <div>
          {!omitTitle ? (
            <h2 id="friends-lb-title" className="friends-lb-title">
              {title}
            </h2>
          ) : null}
          {subtitle ? <p className="friends-lb-sub">{subtitle}</p> : null}
        </div>
        <button type="button" className="friends-lb-refresh" onClick={() => void refresh()} disabled={loading}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="friends-lb-error">{error}</p> : null}

      {friendCount === 0 && !loading && !error ? (
        <p className="friends-lb-muted">No accepted friends yet. Add friends in Settings.</p>
      ) : null}

      <div className="friends-lb-table-wrap">
        <table className="friends-lb-table">
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Rank</th>
              <th scope="col">LP</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((wrap) => {
              const row = wrap.row
              const isSelf = Boolean(row.isSelf)
              const displayName = row.username ?? row.userId
              const isHabit = wrap.kind === 'habit'

              if (!row.hasSyncedData) {
                return (
                  <tr key={row.userId} className={isSelf ? 'friends-lb-row--self' : undefined}>
                    <td>
                      {displayName}
                      {isSelf ? ' (you)' : ''}
                    </td>
                    <td colSpan={2} className="friends-lb-na">
                      No synced data yet
                    </td>
                  </tr>
                )
              }

              if (isHabit) {
                const habitView = row.habitView
                return (
                  <tr key={row.userId} className={isSelf ? 'friends-lb-row--self' : undefined}>
                    <td className="friends-lb-name">
                      {displayName}
                      {isSelf ? <span className="friends-lb-you"> (you)</span> : null}
                    </td>
                    <td>
                      <span className="friends-lb-rank-cell">
                        <span
                          className={`${habitView.emblemWrapClassName} friends-lb-emblem--table rank-emblem-optical-nudge`}
                        >
                          <img src={habitView.emblemSrc} alt="" className={habitView.emblemImgClassName} />
                        </span>
                        <span>{habitView.displayLabel}</span>
                      </span>
                    </td>
                    <td className="friends-lb-lp">{habitView.lp}</td>
                  </tr>
                )
              }

              const view = buildRankDisplayView(row.overallForDisplay.rank, row.overallForDisplay.lp, {
                theme: rankVisualTheme,
                context: 'overall',
                testRankOptions: { apexDivision: row.testRankOverride?.apexDivision },
              })
              return (
                <tr key={row.userId} className={isSelf ? 'friends-lb-row--self' : undefined}>
                  <td className="friends-lb-name">
                    {displayName}
                    {isSelf ? <span className="friends-lb-you"> (you)</span> : null}
                  </td>
                  <td>
                    <span className="friends-lb-rank-cell">
                      <span className={`${view.emblemWrapClassName} friends-lb-emblem--table rank-emblem-optical-nudge`}>
                        <img src={view.emblemSrc} alt="" className={view.emblemImgClassName} />
                      </span>
                      <span>{view.displayLabel}</span>
                    </span>
                  </td>
                  <td className="friends-lb-lp">{view.lp}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
