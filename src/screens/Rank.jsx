import { useMemo } from 'react'
import { habits } from '../data/habits'
import { deriveRanksFromCompletions } from '../utils/rankUpdate'
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

function Rank({ completions, targetDays, activeHabits }) {
  const ranks = useMemo(
    () => deriveRanksFromCompletions(completions ?? {}, targetDays ?? {}, activeHabits ?? []),
    [completions, targetDays, activeHabits]
  )
  const activeSet = new Set(activeHabits ?? [])
  const visibleHabits = habits.filter((habit) => activeSet.has(habit.name))

  return (
    <div className="screen rank">
      <h1>Rank</h1>
      <div className="rank-cards">
        {visibleHabits.map((habit) => {
          const r = ranks[habit.name] ?? { rank: 'Unranked', lp: 0 }
          const lpPercent = Math.min(100, r.lp)
          const emblemSrc = getRankImage(r.rank)
          return (
            <div key={habit.name} className="rank-card">
              <span className="rank-habit-name">{habit.name}</span>
              <div className="rank-emblem-wrap">
                <img src={emblemSrc} alt="" className="rank-emblem" />
              </div>
              <span className="rank-tier-label">{r.rank}</span>
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
          )
        })}
      </div>
    </div>
  )
}

export default Rank
