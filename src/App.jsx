import { useState, useEffect } from 'react'
import { habits } from './data/habits'
import BottomNav from './components/BottomNav'
import Overview from './screens/Overview'
import Targets from './screens/Targets'
import Log from './screens/Log'
import Rank from './screens/Rank'
import Settings from './screens/Settings'
import {
  STORAGE_COMPLETIONS,
  STORAGE_TARGET_DAYS,
  STORAGE_ACTIVE_HABITS,
  STORAGE_QUANTITY_SETTINGS,
  STORAGE_RANKS_LEGACY,
} from './utils/storageKeys'
import { getTodayDateString, clearTimeOffsetMonths, setTimeOffsetMonths } from './utils/now'
import { generateTestHabitData, applyStatsPreset } from './utils/testData'
import { generateSimulationHistory } from './utils/simulation'
import './App.css'

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
    const stored = localStorage.getItem(STORAGE_COMPLETIONS)
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
    data[h.name] = Array.from({ length: h.defaultWeeklyTarget }, (_, i) => i)
  })
  return data
}

function loadTargetDays() {
  try {
    const stored = localStorage.getItem(STORAGE_TARGET_DAYS)
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

function getInitialActiveHabits() {
  return []
}

function loadActiveHabits() {
  try {
    const stored = localStorage.getItem(STORAGE_ACTIVE_HABITS)
    if (!stored) return getInitialActiveHabits()
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return getInitialActiveHabits()
    const validNames = new Set(habits.map((h) => h.name))
    return [...new Set(parsed.filter((name) => typeof name === 'string' && validNames.has(name)))]
  } catch {
    return getInitialActiveHabits()
  }
}

function getInitialQuantitySettings() {
  const data = {}
  habits.forEach((h) => {
    data[h.name] = ''
  })
  return data
}

function loadQuantitySettings() {
  try {
    const stored = localStorage.getItem(STORAGE_QUANTITY_SETTINGS)
    if (!stored) return getInitialQuantitySettings()
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return getInitialQuantitySettings()
    const result = getInitialQuantitySettings()
    habits.forEach((h) => {
      const value = parsed[h.name]
      if (typeof value === 'string') result[h.name] = value
      if (typeof value === 'number') result[h.name] = String(value)
    })
    return result
  } catch {
    return getInitialQuantitySettings()
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [completions, setCompletions] = useState(loadCompletions)
  const [activeHabits, setActiveHabits] = useState(loadActiveHabits)
  const [targetDays, setTargetDays] = useState(loadTargetDays)
  const [quantitySettings, setQuantitySettings] = useState(loadQuantitySettings)
  const [timeOffsetTick, setTimeOffsetTick] = useState(0)
  const Screen = TABS[activeTab]

  useEffect(() => {
    localStorage.setItem(STORAGE_COMPLETIONS, JSON.stringify(completions))
  }, [completions])

  useEffect(() => {
    localStorage.setItem(STORAGE_TARGET_DAYS, JSON.stringify(targetDays))
  }, [targetDays])

  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_HABITS, JSON.stringify(activeHabits))
  }, [activeHabits])

  useEffect(() => {
    localStorage.setItem(STORAGE_QUANTITY_SETTINGS, JSON.stringify(quantitySettings))
  }, [quantitySettings])

  const bumpTimeOffset = () => setTimeOffsetTick((t) => t + 1)

  const resetAllProgress = () => {
    if (
      !window.confirm(
        'Reset all progress? Completions, target days, week data, and test overrides will be cleared.'
      )
    ) {
      return
    }
    localStorage.removeItem(STORAGE_COMPLETIONS)
    localStorage.removeItem(STORAGE_TARGET_DAYS)
    localStorage.removeItem(STORAGE_ACTIVE_HABITS)
    localStorage.removeItem(STORAGE_QUANTITY_SETTINGS)
    localStorage.removeItem(STORAGE_RANKS_LEGACY)
    clearTimeOffsetMonths()
    bumpTimeOffset()
    setCompletions({ ...initialCompletions })
    setActiveHabits(getInitialActiveHabits())
    setTargetDays(getInitialTargetDays())
    setQuantitySettings(getInitialQuantitySettings())
  }

  const toggleActiveHabit = (habitName) => {
    setActiveHabits((prev) =>
      prev.includes(habitName)
        ? prev.filter((name) => name !== habitName)
        : [...prev, habitName]
    )
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
    const targetDate = dateStr ?? getTodayDateString()
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

  const updateQuantitySetting = (habitName, value) => {
    setQuantitySettings((prev) => ({ ...prev, [habitName]: value }))
  }

  const applyGeneratedTestData = (data) => {
    setCompletions(data.completions)
    setActiveHabits(data.activeHabits)
    setTargetDays(data.targetDays)
    setQuantitySettings(data.quantitySettings)
    bumpTimeOffset()
  }

  const handleGenerateTestData = (months) => {
    const data = generateTestHabitData(months, { mixed: true })
    applyGeneratedTestData(data)
  }

  const handleApplyStatsPreset = (level) => {
    const data = applyStatsPreset(level)
    applyGeneratedTestData(data)
  }

  const handleApplySimulation = (scenario) => {
    const data = generateSimulationHistory(scenario ?? {})
    applyGeneratedTestData(data)
  }

  const handleApplyTestRank = () => {}

  const handleApplyTimeOffset = (months) => {
    setTimeOffsetMonths(months)
    bumpTimeOffset()
  }

  return (
    <div className="app">
      <main className="content">
        <Screen
          completions={completions}
          onToggleHabit={toggleHabit}
          activeHabits={activeHabits}
          onToggleActiveHabit={toggleActiveHabit}
          targetDays={targetDays}
          onToggleTargetDay={toggleTargetDay}
          quantitySettings={quantitySettings}
          onUpdateQuantitySetting={updateQuantitySetting}
          onResetAllProgress={resetAllProgress}
          timeOffsetTick={timeOffsetTick}
          testRankOverride={null}
          onApplySimulation={handleApplySimulation}
          onGenerateTestData={handleGenerateTestData}
          onApplyStatsPreset={handleApplyStatsPreset}
          onApplyTestRank={handleApplyTestRank}
          onApplyTimeOffset={handleApplyTimeOffset}
        />
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
