import RankCardsView from './RankCardsView'
import '../screens/Rank.css'
import '../screens/Overview.css'

/** Read-only rank view for a friend (same card layout as Rank tab). */
export default function SocialFriendRankDetail({ friend, rankVisualTheme, onBack }) {
  const title = friend?.username ?? friend?.userId ?? 'Friend'

  if (!friend?.hasSyncedData || !friend?.rankSnapshot) {
    return (
      <div className="social-detail social-detail--rank">
        <div className="rank-screen-head">
          <h1>{title}</h1>
          <button type="button" className="overview-pill" onClick={onBack}>
            Back
          </button>
        </div>
        <p className="social-muted">No synced habit data yet for this friend.</p>
      </div>
    )
  }

  const { completions, targetDays, activeHabits, habitTargetHistory } = friend.rankSnapshot
  const testRankOverride =
    friend.testRankOverride && typeof friend.testRankOverride === 'object' ? friend.testRankOverride : null

  return (
    <div className="social-detail social-detail--rank">
      <div className="rank-screen-head">
        <h1>{title}</h1>
        <button type="button" className="overview-pill" onClick={onBack}>
          Back
        </button>
      </div>
      <RankCardsView
        completions={completions}
        targetDays={targetDays}
        activeHabits={activeHabits}
        habitTargetHistory={habitTargetHistory}
        testRankOverride={testRankOverride}
        rankVisualTheme={rankVisualTheme}
        timeOffsetTick={0}
      />
    </div>
  )
}
