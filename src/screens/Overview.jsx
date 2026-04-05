import { useState, useMemo } from 'react'
import { Sparkles, HeartPulse, Dumbbell, Brain, ShieldCheck, Info } from 'lucide-react'
import { MAIN_CATEGORIES } from '../data/categories'
import { deriveLongTermStats } from '../utils/stats'
import { internalStatToPercent } from '../utils/statsConversion'
import { getStatsTrackingMeta } from '../utils/statsMeta'
import RadarChart from '../components/RadarChart'
import './Overview.css'

const CATEGORY_ICONS = {
  Overall: Sparkles,
  Health: HeartPulse,
  Strength: Dumbbell,
  Intelligence: Brain,
  Discipline: ShieldCheck,
}

const SECONDARY_CATEGORIES = MAIN_CATEGORIES

function getCategoryScores(completions, targetDays, activeHabits) {
  const derived = deriveLongTermStats(completions ?? {}, targetDays ?? {}, activeHabits ?? [])
  return {
    Strength: internalStatToPercent(derived.strength),
    Health: internalStatToPercent(derived.health),
    Intelligence: internalStatToPercent(derived.intelligence),
    Discipline: internalStatToPercent(derived.discipline),
    Overall: internalStatToPercent(derived.overall),
  }
}

function getDay1Scores() {
  const scores = {}
  MAIN_CATEGORIES.forEach((c) => (scores[c] = 0))
  scores.Overall = 0
  return scores
}

function formatUnmappedNames(names) {
  if (names.length === 0) return ''
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')}, +${names.length - 2}`
}

function Overview({ completions, targetDays, activeHabits, timeOffsetTick = 0 }) {
  const [ratingView, setRatingView] = useState('current')

  const tracking = useMemo(
    () => getStatsTrackingMeta(activeHabits),
    [activeHabits, timeOffsetTick]
  )

  const currentScores = useMemo(
    () => getCategoryScores(completions, targetDays, activeHabits),
    [completions, targetDays, activeHabits, timeOffsetTick]
  )
  const day1Scores = getDay1Scores()
  const scores = ratingView === 'day1' ? day1Scores : currentScores

  const showUnmappedNotice = tracking.unmappedCount > 0

  return (
    <div className="screen overview">
      <header className="overview-header">
        <div className="overview-header-top">
          <h1 className="overview-title">Stats</h1>
          <div className="overview-pills">
            <button
              type="button"
              className={`overview-pill ${ratingView === 'current' ? 'active' : ''}`}
              onClick={() => setRatingView('current')}
            >
              Current
            </button>
            <button
              type="button"
              className={`overview-pill ${ratingView === 'day1' ? 'active' : ''}`}
              onClick={() => setRatingView('day1')}
            >
              Day 1
            </button>
          </div>
        </div>
        {showUnmappedNotice && (
          <div className="overview-notice" role="status">
            <Info size={16} strokeWidth={2} className="overview-notice-icon" aria-hidden />
            <span>
              {tracking.unmappedCount} unmapped · {formatUnmappedNames(tracking.unmappedNames)}
            </span>
          </div>
        )}
      </header>

      <section className="overview-cards">
        <div className="overview-card overview-card-primary">
          <div className="overview-card-header">
            <div className="overview-card-title">
              <span className="overview-card-icon">
                <Sparkles size={22} strokeWidth={2} />
              </span>
              <span className="overview-card-name">Overall</span>
            </div>
            <span className="overview-card-score">{scores.Overall}</span>
          </div>
          <div className="overview-card-bar">
            <div
              className="overview-card-fill"
              style={{ width: `${Math.min(scores.Overall, 100)}%` }}
            />
          </div>
        </div>

        <div className="overview-cards-grid">
          {SECONDARY_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category]
            return (
              <div key={category} className="overview-card overview-card-secondary">
                <div className="overview-card-header">
                  <div className="overview-card-title">
                    <span className="overview-card-icon">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="overview-card-name">{category}</span>
                  </div>
                  <span className="overview-card-score">{scores[category]}</span>
                </div>
                <div className="overview-card-bar">
                  <div
                    className="overview-card-fill"
                    style={{ width: `${Math.min(scores[category], 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="overview-radar">
        <RadarChart scores={scores} />
      </section>
    </div>
  )
}

export default Overview
