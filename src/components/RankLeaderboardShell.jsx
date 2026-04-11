import { useMemo, useState } from 'react'
import { habits } from '../data/habits'
import FriendsRankLeaderboard from './FriendsRankLeaderboard'
import './RankLeaderboardShell.css'

export default function RankLeaderboardShell({
  onClose,
  completions,
  targetDays,
  activeHabits,
  habitConfigHistory,
  testRankOverride,
  rankVisualTheme = 'lol',
  timeOffsetTick = 0,
}) {
  const [mode, setMode] = useState('overall')
  const [selectedHabitId, setSelectedHabitId] = useState(() => habits[0]?.id ?? '')

  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId) ?? habits[0] ?? null,
    [selectedHabitId]
  )

  return (
    <div className="rank-lb-shell">
      <header className="rank-lb-shell-header">
        <button type="button" className="rank-lb-shell-back" onClick={onClose}>
          Back
        </button>
        <h1 className="rank-lb-shell-title">Leaderboard</h1>
        <span className="rank-lb-shell-spacer" aria-hidden="true" />
      </header>

      <div className="rank-lb-shell-controls">
        <div className="rank-lb-seg" role="tablist" aria-label="Leaderboard mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'overall'}
            className={`rank-lb-seg-btn ${mode === 'overall' ? 'rank-lb-seg-btn--active' : ''}`}
            onClick={() => setMode('overall')}
          >
            Overall
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'habit'}
            className={`rank-lb-seg-btn ${mode === 'habit' ? 'rank-lb-seg-btn--active' : ''}`}
            onClick={() => setMode('habit')}
          >
            Habit
          </button>
        </div>
        {mode === 'habit' && selectedHabit ? (
          <label className="rank-lb-habit-label">
            <span className="rank-lb-sr-only">Habit</span>
            <select
              className="rank-lb-habit-select"
              value={selectedHabit.id}
              onChange={(e) => setSelectedHabitId(e.target.value)}
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="rank-lb-shell-body">
        <FriendsRankLeaderboard
          completions={completions}
          targetDays={targetDays}
          activeHabits={activeHabits}
          habitConfigHistory={habitConfigHistory}
          testRankOverride={testRankOverride}
          rankVisualTheme={rankVisualTheme}
          timeOffsetTick={timeOffsetTick}
          mode={mode}
          selectedHabit={mode === 'habit' ? selectedHabit : null}
          title="Leaderboard"
          embedded
          omitTitle
        />
      </div>
    </div>
  )
}
