import { habits } from '../data/habits'
import './Targets.css'

function Targets({ targetDays, onToggleTargetDay }) {
  const data = targetDays ?? {}

  return (
    <div className="screen targets">
      <h1>Targets</h1>
      <p className="targets-subtitle">Which days you plan to do each habit</p>

      <div className="targets-habit-cards">
        {habits.map((habit) => {
          const selectedDays = data[habit.name] ?? []
          const targetCount = selectedDays.length

          return (
            <div key={habit.name} className="targets-habit-card">
              <h3 className="targets-habit-name">{habit.name}</h3>
              <div className="targets-day-squares">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const isSelected = selectedDays.includes(dayIndex)
                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      className={`targets-day-square ${isSelected ? 'active' : ''}`}
                      onClick={() => onToggleTargetDay?.(habit.name, dayIndex)}
                      aria-label={`${habit.name} day ${dayIndex} ${isSelected ? 'selected' : 'not selected'}`}
                    />
                  )
                })}
              </div>
              <span className="targets-target-count">{targetCount} days</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Targets
