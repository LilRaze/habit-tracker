import { useState } from 'react'
import { Sparkles, HeartPulse, Dumbbell, Brain, ShieldCheck } from 'lucide-react'
import { habits } from '../data/habits'
import { HABIT_CATEGORY_POINTS, MAIN_CATEGORIES } from '../data/categories'
import { getWeekStartKey, getCountForWeekStart } from '../utils/progress'
import RadarChart from '../components/RadarChart'
import './Overview.css'

const CATEGORY_ICONS = {
  Overall: Sparkles,
  Health: HeartPulse,
  Strength: Dumbbell,
  Intelligence: Brain,
  Discipline: ShieldCheck,
}

const SECONDARY_CATEGORIES = ['Health', 'Strength', 'Intelligence', 'Discipline']

function getCategoryScores(completions) {
  const weekStart = getWeekStartKey()
  const weeklyCounts = {}
  habits.forEach((h) => {
    weeklyCounts[h.name] = getCountForWeekStart(completions?.[h.name] ?? [], weekStart)
  })

  const scores = {}
  for (const category of MAIN_CATEGORIES) {
    let current = 0
    let max = 0
    for (const habit of habits) {
      const points = HABIT_CATEGORY_POINTS[habit.name]?.[category] ?? 0
      current += weeklyCounts[habit.name] * points
      max += habit.weeklyTarget * points
    }
    scores[category] =
      max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  }

  const avg =
    MAIN_CATEGORIES.reduce((sum, c) => sum + scores[c], 0) / MAIN_CATEGORIES.length
  scores.Overall = Math.round(avg)

  return scores
}

function getDay1Scores() {
  const scores = {}
  MAIN_CATEGORIES.forEach((c) => (scores[c] = 0))
  scores.Overall = 0
  return scores
}

function Overview({ completions }) {
  const [ratingView, setRatingView] = useState('current')

  const currentScores = getCategoryScores(completions)
  const day1Scores = getDay1Scores()
  const scores = ratingView === 'day1' ? day1Scores : currentScores

  return (
    <div className="screen overview">
      <header className="overview-header">
        <h1 className="overview-title">My Rating</h1>
        <p className="overview-subtitle">Track your progress across key life categories</p>
        <div className="overview-pills">
          <button
            type="button"
            className={`overview-pill ${ratingView === 'current' ? 'active' : ''}`}
            onClick={() => setRatingView('current')}
          >
            Current rating
          </button>
          <button
            type="button"
            className={`overview-pill ${ratingView === 'day1' ? 'active' : ''}`}
            onClick={() => setRatingView('day1')}
          >
            Day 1 rating
          </button>
        </div>
      </header>

      <section className="overview-cards">
        <div className="overview-card overview-card-primary">
          <div className="overview-card-header">
            <div className="overview-card-title">
              <span className="overview-card-icon">
                <Sparkles size={20} strokeWidth={2} />
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
