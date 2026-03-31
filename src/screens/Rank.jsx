import { useMemo } from 'react'
import { habits } from '../data/habits'
import { getHelmetImageUrlFromRank } from '../utils/rankAssets'
import { RANK_LADDER } from '../data/ranks'
import { deriveRanksV4 } from '../utils/rankEngineV4'
import './Rank.css'

// Tier emblems (divisions within a tier share the same image)
import unrankedImg from '../assets/ranks/unranked.webp'
import ironImg from '../assets/ranks/iron.webp'
import bronzeImg from '../assets/ranks/bronze.webp'
import silverImg from '../assets/ranks/silver.webp'
import goldImg from '../assets/ranks/gold.webp'
import platinumImg from '../assets/ranks/platinum.webp'
import emeraldImg from '../assets/ranks/emerald.webp'
import diamondImg from '../assets/ranks/diamond.webp'
import masterImg from '../assets/ranks/master.webp'
import grandmasterImg from '../assets/ranks/grandmaster.webp'
import challengerImg from '../assets/ranks/challenger.webp'

const TIER_IMAGES = {
  Unranked: unrankedImg,
  Iron: ironImg,
  Bronze: bronzeImg,
  Silver: silverImg,
  Gold: goldImg,
  Platinum: platinumImg,
  Emerald: emeraldImg,
  Diamond: diamondImg,
  Master: masterImg,
  Grandmaster: grandmasterImg,
  Challenger: challengerImg,
}

/** Per-rank overrides when a rank needs a different image than its tier default */
const RANK_OVERRIDES = {}

function getTierFromRank(rank) {
  if (rank === 'Unranked') return 'Unranked'
  const tier = rank.split(' ')[0]
  return TIER_IMAGES[tier] ? tier : 'Unranked'
}

function getRankImage(rank) {
  return RANK_OVERRIDES[rank] ?? TIER_IMAGES[getTierFromRank(rank)] ?? unrankedImg
}

function rankToProgressValue(rank, lp) {
  const rankIndex = RANK_LADDER.indexOf(rank)
  const safeRankIndex = rankIndex >= 0 ? rankIndex : 0
  const safeLp = Number.isFinite(lp) ? Math.max(0, Math.min(99, lp)) : 0
  return safeRankIndex * 100 + safeLp
}

function progressValueToRank(progressValue) {
  const clamped = Math.max(0, progressValue)
  const rankIndex = Math.min(
    RANK_LADDER.length - 1,
    Math.floor(clamped / 100)
  )
  const lp = rankIndex >= RANK_LADDER.length - 1 ? 99 : clamped % 100
  return { rank: RANK_LADDER[rankIndex], lp }
}

function Rank({ completions, targetDays, activeHabits, testRankOverride, timeOffsetTick = 0 }) {
  const rankData = useMemo(
    () => deriveRanksV4(completions ?? {}, targetDays ?? {}, activeHabits ?? []),
    [completions, targetDays, activeHabits, timeOffsetTick]
  )
  const activeSet = new Set(activeHabits ?? [])
  const visibleHabits = rankData.habits.filter((h) => activeSet.has(h.habitName) || activeSet.has(h.habitId))
  const overallRank = useMemo(() => {
    return { rank: rankData.overall.rank, lp: rankData.overall.lp }
  }, [rankData.overall.rank, rankData.overall.lp])

  return (
    <div className="screen rank">
      <h1>Rank</h1>
      <div className="rank-cards">
        <div className="rank-card rank-card-overall">
          <span className="rank-habit-name">Overall Rank</span>
          <div className="rank-emblem-wrap rank-emblem-wrap--helmet">
            <img
              src={getHelmetImageUrlFromRank(overallRank.rank, {
                apexDivision: testRankOverride?.apexDivision,
              })}
              alt=""
              className="rank-emblem rank-emblem--helmet"
            />
          </div>
          <span className="rank-tier-label">{overallRank.rank}</span>
          <div className="rank-lp-row">
            <span className="rank-lp-value">{overallRank.lp}</span>
            <span className="rank-lp-label">LP</span>
          </div>
          <div className="rank-lp-bar">
            <div
              className="rank-lp-fill"
              style={{ width: `${Math.min(100, overallRank.lp)}%` }}
            />
          </div>
        </div>

        {visibleHabits.map((mock) => {
          const r = { rank: mock.rank, lp: mock.lp }
          const lpPercent = Math.min(100, r.lp)
          const emblemSrc = getRankImage(r.rank)
          const key = mock.habitId || mock.habitName
          return (
            <div
              key={key}
              className="rank-card rank-card-habit rank-card-habit--expanded"
            >
              <div className="rank-card-habit-main">
                <span className="rank-habit-name">{mock.habitName}</span>
                <span className="rank-tier-label">{r.rank}</span>
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
                <div className="rank-emblem-wrap">
                  <img src={emblemSrc} alt="" className="rank-emblem" />
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
