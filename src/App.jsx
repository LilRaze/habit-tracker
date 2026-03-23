import { useState, useEffect } from 'react'
import { habits } from './data/habits'
import BottomNav from './components/BottomNav'
import Overview from './screens/Overview'
import Targets from './screens/Targets'
import Log from './screens/Log'
import Rank from './screens/Rank'
import Settings from './screens/Settings'
import './App.css'

const STORAGE_KEY = 'habit-tracker-completions'
const TARGET_DAYS_KEY = 'habit-tracker-target-days'

const TABS = {
  overview: Overview,
  targets: Targets,
  log: Log,
  rank: Rank,
  settings: Settings,
}

const initialCompletions = {}
habits.forEach((h) => {
  initialCompletions[h.name] = []
})

function loadCompletions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return initialCompletions
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return initialCompletions
    const result = { ...initialCompletions }
    habits.forEach((h) => {
      if (Array.isArray(parsed[h.name])) {
        result[h.name] = parsed[h.name].filter(
          (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
        )
      }
    })
    return result
  } catch {
    return initialCompletions
  }
}

function getInitialTargetDays() {
  const data = {}
  habits.forEach((h) => {
    data[h.name] = Array.from({ length: h.weeklyTarget }, (_, i) => i)
  })
  return data
}

function loadTargetDays() {
  try {
    const stored = localStorage.getItem(TARGET_DAYS_KEY)
    if (!stored) return getInitialTargetDays()
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return getInitialTargetDays()
    const result = getInitialTargetDays()
    habits.forEach((h) => {
      if (Array.isArray(parsed[h.name])) {
        const valid = parsed[h.name].filter(
          (d) => typeof d === 'number' && d >= 0 && d <= 6 && Number.isInteger(d)
        )
        result[h.name] = [...new Set(valid)].sort((a, b) => a - b)
      }
    })
    return result
  } catch {
    return getInitialTargetDays()
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [completions, setCompletions] = useState(loadCompletions)
  const [targetDays, setTargetDays] = useState(loadTargetDays)
  const Screen = TABS[activeTab]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completions))
  }, [completions])

  useEffect(() => {
    localStorage.setItem(TARGET_DAYS_KEY, JSON.stringify(targetDays))
  }, [targetDays])

  const resetAllProgress = () => {
    if (!window.confirm('Reset all progress? Completions, target days, and week data will be cleared.')) {
      return
    }
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TARGET_DAYS_KEY)
    localStorage.removeItem('habit-tracker-ranks')
    setCompletions({ ...initialCompletions })
    setTargetDays(getInitialTargetDays())
  }

  const toggleTargetDay = (habitName, dayIndex) => {
    setTargetDays((prev) => {
      const days = prev[habitName] ?? []
      const has = days.includes(dayIndex)
      const next = { ...prev }
      next[habitName] = has
        ? days.filter((d) => d !== dayIndex)
        : [...days, dayIndex].sort((a, b) => a - b)
      return next
    })
  }

  const toggleHabit = (habitName, dateStr) => {
    const targetDate = dateStr ?? new Date().toISOString().slice(0, 10)
    setCompletions((prev) => {
      const dates = prev[habitName] ?? []
      const next = { ...prev }
      if (dates.includes(targetDate)) {
        next[habitName] = dates.filter((d) => d !== targetDate)
      } else {
        next[habitName] = [...dates, targetDate]
      }
      return next
    })
  }

  return (
    <div className="app">
      <main className="content">
        <Screen
          completions={completions}
          onToggleHabit={toggleHabit}
          targetDays={targetDays}
          onToggleTargetDay={toggleTargetDay}
          onResetAllProgress={resetAllProgress}
        />
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
