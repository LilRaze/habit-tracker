import { useMemo } from 'react'
import { deriveRanksV4 } from '../utils/rankEngineV4'
import { getRankCardPresentation } from '../utils/rankDisplayPresentation'
import './Rank.css'

function Rank({
  completions,
  targetDays,
  activeHabits,
  testRankOverride,
  rankVisualTheme = 'lol',
  timeOffsetTick = 0,
}) {
  const rankData = useMemo(
    () => deriveRanksV4(completions ?? {}, targetDays ?? {}, activeHabits ?? []),
    [completions, targetDays, activeHabits, timeOffsetTick]
  )

  const activeSet = new Set(activeHabits ?? [])
  const visibleHabits = rankData.habits.filter((h) => activeSet.has(h.habitName) || activeSet.has(h.habitId))

  const overallForDisplay = useMemo(() => {
    if (testRankOverride?.rank) {
      return { rank: testRankOverride.rank, lp: testRankOverride.lp }
    }
    return { rank: rankData.overall.rank, lp: rankData.overall.lp }
  }, [testRankOverride, rankData.overall.rank, rankData.overall.lp])

  const overallPresentation = useMemo(
    () =>
      getRankCardPresentation(overallForDisplay.rank, {
        theme: rankVisualTheme,
        testRankOptions: { apexDivision: testRankOverride?.apexDivision },
      }),
    [overallForDisplay.rank, rankVisualTheme, testRankOverride?.apexDivision]
  )

  return (
    <div className="screen rank">
      <h1>Rank</h1>
      <div className="rank-cards">
        <div className="rank-card rank-card-overall">
          <span className="rank-habit-name">Overall Rank</span>
          <div className={overallPresentation.emblemWrapClassName}>
            <img
              src={overallPresentation.emblemSrc}
              alt=""
              className={overallPresentation.emblemImgClassName}
            />
          </div>
          <span className="rank-tier-label">{overallPresentation.displayLabel}</span>
          <div className="rank-lp-row">
            <span className="rank-lp-value">{overallForDisplay.lp}</span>
            <span className="rank-lp-label">LP</span>
          </div>
          <div className="rank-lp-bar">
            <div
              className="rank-lp-fill"
              style={{ width: `${Math.min(100, overallForDisplay.lp)}%` }}
            />
          </div>
        </div>

        {visibleHabits.map((mock) => {
          const r = { rank: mock.rank, lp: mock.lp }
          const lpPercent = Math.min(100, r.lp)
          const habitPresentation = getRankCardPresentation(r.rank, {
            theme: rankVisualTheme,
            testRankOptions: {},
          })
          const key = mock.habitId || mock.habitName
          return (
            <div
              key={key}
              className="rank-card rank-card-habit rank-card-habit--expanded"
            >
              <div className="rank-card-habit-main">
                <span className="rank-habit-name">{mock.habitName}</span>
                <span className="rank-tier-label">{habitPresentation.displayLabel}</span>
                <div className="rank-lp-and-bar">
                  <div className="rank-lp-row">
                    <span className="rank-lp-value">{r.lp}</span>
                    <span className="rank-lp-label">LP</span>
                  </div>
                  <div className="rank-lp-bar">
                    <div
                      className="rank-lp-fill"
                      style={{ width: `${lpPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="rank-card-habit-logo">
                <div className={habitPresentation.emblemWrapClassName}>
                  <img
                    src={habitPresentation.emblemSrc}
                    alt=""
                    className={habitPresentation.emblemImgClassName}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Rank
