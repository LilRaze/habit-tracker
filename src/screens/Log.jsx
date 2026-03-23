import { useState } from 'react'
import { habits } from '../data/habits'
import { getWeekStartKey, addDaysToDateStr } from '../utils/progress'
import './Log.css'

function Log({ completions, onToggleHabit }) {
  const [weekStart, setWeekStart] = useState(getWeekStartKey)

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDaysToDateStr(weekStart, i)
  )

  const weekStartDate = new Date(weekStart + 'T12:00:00')
  const weekEndDate = new Date(weekStart + 'T12:00:00')
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const rangeFormatted = `${weekStartDate.getDate()} ${weekStartDate.toLocaleDateString('en', { month: 'short' })} – ${weekEndDate.getDate()} ${weekEndDate.toLocaleDateString('en', { month: 'short' })} ${weekEndDate.getFullYear()}`

  const goToPreviousWeek = () => {
    setWeekStart((prev) => addDaysToDateStr(prev, -7))
  }

  const goToNextWeek = () => {
    setWeekStart((prev) => addDaysToDateStr(prev, 7))
  }

  return (
    <div className="screen log">
      <h1>Log</h1>

      <div className="log-week-nav">
        <button
          type="button"
          className="log-nav-btn"
          onClick={goToPreviousWeek}
          aria-label="Previous week"
        >
          ←
        </button>
        <span className="log-week-range">{rangeFormatted}</span>
        <button
          type="button"
          className="log-nav-btn"
          onClick={goToNextWeek}
          aria-label="Next week"
        >
          →
        </button>
      </div>

      <div className="log-habit-cards">
        {habits.map((habit) => {
          const completedDates = completions?.[habit.name] ?? []
          return (
            <div key={habit.name} className="log-habit-card">
              <h3 className="log-habit-name">{habit.name}</h3>
              <div className="log-day-squares">
                {weekDates.map((dateStr) => {
                  const isCompleted = completedDates.includes(dateStr)
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`log-day-square ${isCompleted ? 'active' : ''}`}
                      onClick={() => onToggleHabit?.(habit.name, dateStr)}
                      aria-label={`${habit.name} ${dateStr} ${isCompleted ? 'completed' : 'not completed'}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Log
