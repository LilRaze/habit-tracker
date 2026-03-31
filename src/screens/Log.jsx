import { useState, useEffect } from 'react'
import { getWeekStartKey, addDaysToDateStr } from '../utils/progress'
import './Log.css'

function Log({ completions, onToggleHabit, activeHabits, timeOffsetTick = 0 }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStartKey())
  const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false)
  const [pickerWeek, setPickerWeek] = useState('')

  useEffect(() => {
    setWeekStart(getWeekStartKey())
  }, [timeOffsetTick])
  const visibleHabitNames = activeHabits ?? []

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

  const handleWeekLabelClick = () => {
    setIsWeekPickerOpen((prev) => !prev)
  }

  const handlePickerChange = (e) => {
    setPickerWeek(e.target.value)
  }

  const handlePickerApply = () => {
    if (!pickerWeek) return
    const [yearPart, weekPart] = pickerWeek.split('-W')
    const year = Number(yearPart)
    const weekNum = Number(weekPart)
    if (!Number.isFinite(year) || !Number.isFinite(weekNum) || weekNum <= 0) return
    const simple = new Date(year, 0, 1 + (weekNum - 1) * 7)
    const day = simple.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(simple)
    monday.setDate(simple.getDate() - diff)
    const targetWeekStart = getWeekStartKey(monday)
    setWeekStart(targetWeekStart)
    setIsWeekPickerOpen(false)
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
        <button
          type="button"
          className="log-week-range-btn"
          onClick={handleWeekLabelClick}
          aria-label="Choose week"
        >
          <span className="log-week-range">{rangeFormatted}</span>
        </button>
        <button
          type="button"
          className="log-nav-btn"
          onClick={goToNextWeek}
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {isWeekPickerOpen && (
        <div className="log-week-picker-overlay" aria-modal="true" role="dialog">
          <div className="log-week-picker">
            <div className="log-week-picker-header">
              <span className="log-week-picker-title">Jump to week</span>
              <button
                type="button"
                className="log-week-picker-close"
                onClick={() => setIsWeekPickerOpen(false)}
                aria-label="Close week picker"
              >
                ×
              </button>
            </div>
            <label className="log-week-picker-row">
              <span>Select ISO week</span>
              <input
                type="week"
                className="log-week-picker-input"
                value={pickerWeek}
                onChange={handlePickerChange}
              />
            </label>
            <button
              type="button"
              className="log-week-picker-apply"
              onClick={handlePickerApply}
            >
              Go to week
            </button>
          </div>
        </div>
      )}

      <div className="log-habit-cards">
        {visibleHabitNames.map((habitName) => {
          const completedDates = completions?.[habitName] ?? []
          return (
            <div key={habitName} className="log-habit-card">
              <h3 className="log-habit-name">{habitName}</h3>
              <div className="log-day-squares">
                {weekDates.map((dateStr) => {
                  const isCompleted = completedDates.includes(dateStr)
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`log-day-square ${isCompleted ? 'active' : ''}`}
                      onClick={() => onToggleHabit?.(habitName, dateStr)}
                      aria-label={`${habitName} ${dateStr} ${isCompleted ? 'completed' : 'not completed'}`}
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
