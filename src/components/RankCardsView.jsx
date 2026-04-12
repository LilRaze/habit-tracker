import { useMemo } from 'react'
import { deriveRanksV4 } from '../utils/rankEngineV4'
import { ensureHabitTargetHistoryShape } from '../utils/habitTargetHistory'
import { buildRankDisplayView } from '../utils/rankDisplayPresentation'
import '../screens/Rank.css'

/**
 * Shared overall + per-habit rank cards (same layout as Rank tab).
 * @param {Object} props
 * @param {Record<string, string[]>} props.completions
 * @param {Record<string, number[]>} props.targetDays
 * @param {string[]} props.activeHabits
 * @param {Record<string, { effectiveFrom: string, targetDays: number[] }[]>} [props.habitTargetHistory]
 * @param {import('../utils/testRankOverride').TestRankOverride | null} [props.testRankOverride]
 * @param {'lol'|'valorant'} [props.rankVisualTheme]
 * @param {number} [props.timeOffsetTick]
 */
export default function RankCardsView({
  completions,
  targetDays,
  activeHabits,
  habitTargetHistory,
  testRankOverride,
  rankVisualTheme = 'lol',
  timeOffsetTick = 0,
}) {
  const rankData = useMemo(
    () =>
      deriveRanksV4(
        completions ?? {},
        targetDays ?? {},
        activeHabits ?? [],
        ensureHabitTargetHistoryShape(habitTargetHistory ?? null, targetDays ?? {})
      ),
    [completions, targetDays, activeHabits, habitTargetHistory, timeOffsetTick]
  )

  const activeSet = new Set(activeHabits ?? [])
  const visibleHabits = rankData.habits.filter((h) => activeSet.has(h.habitName) || activeSet.has(h.habitId))

  // Always show live overall rank + LP from the engine. Settings "test rank" is for
  // helmet/visual edge cases (apexDivision); replacing rank+lp here froze the UI and hid
  // real LP progression while override was set.
  const overallForDisplay = useMemo(
    () => ({ rank: rankData.overall.rank, lp: rankData.overall.lp }),
    [rankData.overall.rank, rankData.overall.lp]
  )

  const overallView = useMemo(
    () =>
      buildRankDisplayView(overallForDisplay.rank, overallForDisplay.lp, {
        theme: rankVisualTheme,
        context: 'overall',
        testRankOptions: { apexDivision: testRankOverride?.apexDivision },
      }),
    [overallForDisplay.rank, overallForDisplay.lp, rankVisualTheme, testRankOverride?.apexDivision]
  )

  return (
    <div className="rank-cards">
      <div className="rank-card rank-card-overall">
        <span className="rank-habit-name">Overall Rank</span>
        <div className={overallView.emblemWrapClassName}>
          <img src={overallView.emblemSrc} alt="" className={overallView.emblemImgClassName} />
        </div>
        <span className="rank-tier-label">{overallView.displayLabel}</span>
        {overallView.nextRankLabel ? (
          <span className="rank-next-hint">Next: {overallView.nextRankLabel}</span>
        ) : null}
        <div className="rank-lp-row">
          <span className="rank-lp-value">{overallView.lp}</span>
          <span className="rank-lp-label">LP</span>
        </div>
        <div className="rank-lp-bar">
          <div className="rank-lp-fill" style={{ width: `${Math.min(100, overallView.lp)}%` }} />
        </div>
      </div>

      {visibleHabits.map((mock) => {
        const habitView = buildRankDisplayView(mock.rank, mock.lp, {
          theme: rankVisualTheme,
          context: 'habit',
          testRankOptions: {},
        })
        const key = mock.habitId || mock.habitName
        return (
          <div key={key} className="rank-card rank-card-habit rank-card-habit--expanded">
            <div className="rank-card-habit-main">
              <span className="rank-habit-name">{mock.habitName}</span>
              <span className="rank-tier-label">{habitView.displayLabel}</span>
              {habitView.nextRankLabel ? (
                <span className="rank-next-hint rank-next-hint--habit">Next: {habitView.nextRankLabel}</span>
              ) : null}
              <div className="rank-lp-and-bar">
                <div className="rank-lp-row">
                  <span className="rank-lp-value">{habitView.lp}</span>
                  <span className="rank-lp-label">LP</span>
                </div>
                <div className="rank-lp-bar">
                  <div className="rank-lp-fill" style={{ width: `${Math.min(100, habitView.lp)}%` }} />
                </div>
              </div>
            </div>
            <div className="rank-card-habit-logo">
              <div className={habitView.emblemWrapClassName}>
                <img src={habitView.emblemSrc} alt="" className={habitView.emblemImgClassName} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
