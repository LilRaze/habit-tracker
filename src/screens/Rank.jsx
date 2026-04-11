import { useState } from 'react'
import RankCardsView from '../components/RankCardsView'
import RankLeaderboardShell from '../components/RankLeaderboardShell'
import './Overview.css'
import './Rank.css'

function Rank({
  completions,
  targetDays,
  activeHabits,
  testRankOverride,
  rankVisualTheme = 'lol',
  timeOffsetTick = 0,
}) {
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)

  if (leaderboardOpen) {
    return (
      <div className="screen rank rank--leaderboard">
        <RankLeaderboardShell
          onClose={() => setLeaderboardOpen(false)}
          completions={completions}
          targetDays={targetDays}
          activeHabits={activeHabits}
          testRankOverride={testRankOverride}
          rankVisualTheme={rankVisualTheme}
          timeOffsetTick={timeOffsetTick}
        />
      </div>
    )
  }

  return (
    <div className="screen rank">
      <div className="rank-screen-head">
        <h1>Rank</h1>
        <button type="button" className="overview-pill" onClick={() => setLeaderboardOpen(true)}>
          Leaderboard
        </button>
      </div>
      <RankCardsView
        completions={completions}
        targetDays={targetDays}
        activeHabits={activeHabits}
        testRankOverride={testRankOverride}
        rankVisualTheme={rankVisualTheme}
        timeOffsetTick={timeOffsetTick}
      />
    </div>
  )
}

export default Rank
