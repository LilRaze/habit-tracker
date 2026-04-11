import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import BottomNav from './components/BottomNav'
import UsernameSetupGate from './components/UsernameSetupGate'
import CloudConflictModal from './components/CloudConflictModal'
import Overview from './screens/Overview'
import Targets from './screens/Targets'
import Log from './screens/Log'
import Rank from './screens/Rank'
import Social from './screens/Social'
import Settings from './screens/Settings'
import { useAuth } from './contexts/AuthContext'
import { useCloudPersistence } from './hooks/useCloudPersistence'
import {
  STORAGE_COMPLETIONS,
  STORAGE_TARGET_DAYS,
  STORAGE_ACTIVE_HABITS,
  STORAGE_HABIT_CONFIG_HISTORY,
  STORAGE_QUANTITY_SETTINGS,
  STORAGE_RANKS_LEGACY,
  STORAGE_TEST_RANK_OVERRIDE,
} from './utils/storageKeys'
import {
  loadCompletions,
  loadTargetDays,
  loadActiveHabits,
  loadHabitConfigHistory,
  loadQuantitySettings,
  persistHabitConfigHistory,
} from './utils/persistedState'
import {
  normalizeSnapshot,
  loadLocalSnapshot,
  getEmptySnapshot,
  persistSnapshotToLocal,
} from './utils/appStateSnapshot'
import { loadRankVisualTheme, saveRankVisualTheme } from './utils/rankVisualTheme'
import { loadTestRankOverride, saveTestRankOverride, clearTestRankOverride } from './utils/testRankOverride'
import { getTodayDateString, clearTimeOffsetMonths, setTimeOffsetMonths, getTimeOffsetMonths } from './utils/now'
import { generateTestHabitData, applyStatsPreset } from './utils/testData'
import { generateSimulationHistory } from './utils/simulation'
import { upsertHabitUserState } from './services/cloudState'
import { sanitizeQuantityTrackingValue } from './utils/quantityInput'
import {
  recordHabitConfigChange,
  sortUniqueDayIndices,
  defaultTargetDayIndicesForHabit,
  ensureHabitConfigHistoryShape,
} from './utils/habitConfigHistory'
import { habits } from './data/habits'
import './App.css'

const TABS = {
  overview: Overview,
  targets: Targets,
  log: Log,
  rank: Rank,
  social: Social,
  settings: Settings,
}

function App() {
  const { user, loading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState('overview')
  const [completions, setCompletions] = useState(loadCompletions)
  const [activeHabits, setActiveHabits] = useState(loadActiveHabits)
  const [targetDays, setTargetDays] = useState(loadTargetDays)
  const [habitConfigHistory, setHabitConfigHistory] = useState(() => {
    const a = loadActiveHabits()
    return loadHabitConfigHistory(a, loadTargetDays())
  })
  const [quantitySettings, setQuantitySettings] = useState(loadQuantitySettings)

  const configSyncRef = useRef({ activeHabits, targetDays })
  configSyncRef.current = { activeHabits, targetDays }
  const [timeOffsetTick, setTimeOffsetTick] = useState(0)
  const [rankVisualTheme, setRankVisualTheme] = useState(loadRankVisualTheme)
  const [testRankOverride, setTestRankOverride] = useState(() => loadTestRankOverride())
  const Screen = TABS[activeTab]

  const bumpTimeOffset = useCallback(() => setTimeOffsetTick((t) => t + 1), [])

  const applySnapshot = useCallback((snap) => {
    const n = normalizeSnapshot(snap)
    setCompletions(n.completions)
    setTargetDays(n.targetDays)
    setActiveHabits(n.activeHabits)
    setHabitConfigHistory(n.habitConfigHistory)
    setQuantitySettings(n.quantitySettings)
    setRankVisualTheme(n.rankVisualTheme)
    setTestRankOverride(n.testRankOverride)
    persistSnapshotToLocal(n)
    bumpTimeOffset()
  }, [bumpTimeOffset])

  const snapshotForSync = useMemo(
    () => ({
      completions,
      targetDays,
      activeHabits,
      habitConfigHistory,
      quantitySettings,
      rankVisualTheme,
      testRankOverride,
      timeOffsetMonths: getTimeOffsetMonths(),
    }),
    [
      completions,
      targetDays,
      activeHabits,
      habitConfigHistory,
      quantitySettings,
      rankVisualTheme,
      testRankOverride,
      timeOffsetTick,
    ]
  )

  const { cloudStatus, conflict, lastError, resolveUseCloud, resolveUseDevice } = useCloudPersistence({
    user,
    authLoading,
    snapshotForSync,
    applySnapshot,
    bumpTimeOffset,
  })

  const handleAfterSignOut = useCallback(() => {
    applySnapshot(loadLocalSnapshot())
  }, [applySnapshot])

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
    persistHabitConfigHistory(habitConfigHistory)
  }, [habitConfigHistory])

  useEffect(() => {
    localStorage.setItem(STORAGE_QUANTITY_SETTINGS, JSON.stringify(quantitySettings))
  }, [quantitySettings])

  useEffect(() => {
    saveRankVisualTheme(rankVisualTheme)
  }, [rankVisualTheme])

  const resetAllProgress = async () => {
    if (
      !window.confirm(
        'Reset all app data on this device? This clears habit completions, active habits, weekly target days, habit configuration history, quantity settings, rank display theme (back to default), test rank override, and simulated time offset. If you are signed in, the empty state will be saved to the cloud as well.'
      )
    ) {
      return
    }
    localStorage.removeItem(STORAGE_COMPLETIONS)
    localStorage.removeItem(STORAGE_TARGET_DAYS)
    localStorage.removeItem(STORAGE_ACTIVE_HABITS)
    localStorage.removeItem(STORAGE_HABIT_CONFIG_HISTORY)
    localStorage.removeItem(STORAGE_QUANTITY_SETTINGS)
    localStorage.removeItem(STORAGE_RANKS_LEGACY)
    localStorage.removeItem(STORAGE_TEST_RANK_OVERRIDE)
    clearTimeOffsetMonths()
    clearTestRankOverride()
    bumpTimeOffset()
    const empty = getEmptySnapshot()
    setCompletions(empty.completions)
    setActiveHabits(empty.activeHabits)
    setTargetDays(empty.targetDays)
    setHabitConfigHistory(empty.habitConfigHistory)
    setQuantitySettings(empty.quantitySettings)
    setRankVisualTheme('lol')
    setTestRankOverride(null)
    if (user) {
      await upsertHabitUserState(user.id, empty)
    }
  }

  const toggleActiveHabit = (habitName) => {
    const today = getTodayDateString()
    const { activeHabits: a, targetDays: t } = configSyncRef.current
    const nextActive = a.includes(habitName) ? a.filter((n) => n !== habitName) : [...a, habitName]
    const habit = habits.find((h) => h.name === habitName)
    const rawDays = t[habitName]
    const nextDays =
      Array.isArray(rawDays) && rawDays.length > 0
        ? sortUniqueDayIndices(rawDays)
        : defaultTargetDayIndicesForHabit(habit ?? { defaultWeeklyTarget: 3, name: habitName })
    setActiveHabits(nextActive)
    setHabitConfigHistory((hist) =>
      recordHabitConfigChange(hist, habitName, today, {
        isActive: nextActive.includes(habitName),
        targetDays: nextDays,
      })
    )
  }

  const toggleTargetDay = (habitName, dayIndex) => {
    let nextDaysForHistory = null
    setTargetDays((prev) => {
      const days = prev[habitName] ?? []
      const has = days.includes(dayIndex)
      const next = { ...prev }
      const nextDays = has ? days.filter((d) => d !== dayIndex) : [...days, dayIndex].sort((a, b) => a - b)
      next[habitName] = nextDays
      nextDaysForHistory = nextDays
      return next
    })
    if (!configSyncRef.current.activeHabits.includes(habitName)) return
    const today = getTodayDateString()
    setHabitConfigHistory((hist) =>
      recordHabitConfigChange(hist, habitName, today, {
        isActive: true,
        targetDays: sortUniqueDayIndices(nextDaysForHistory ?? []),
      })
    )
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
    const cleaned = sanitizeQuantityTrackingValue(value)
    setQuantitySettings((prev) => ({ ...prev, [habitName]: cleaned }))
  }

  const applyGeneratedTestData = (data) => {
    setCompletions(data.completions)
    setActiveHabits(data.activeHabits)
    setTargetDays(data.targetDays)
    setHabitConfigHistory(
      ensureHabitConfigHistoryShape(
        data.habitConfigHistory ?? null,
        data.activeHabits ?? [],
        data.targetDays ?? {}
      )
    )
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

  const handleApplyTestRank = (payload) => {
    saveTestRankOverride(payload ?? null)
    setTestRankOverride(loadTestRankOverride())
  }

  const handleApplyTimeOffset = (months) => {
    setTimeOffsetMonths(months)
    bumpTimeOffset()
  }

  return (
    <div className="app">
      <UsernameSetupGate />
      {conflict ? (
        <CloudConflictModal
          onUseCloud={() => {
            resolveUseCloud()
          }}
          onUseDevice={() => {
            resolveUseDevice()
          }}
        />
      ) : null}
      <main className="content">
        <Screen
          completions={completions}
          onToggleHabit={toggleHabit}
          activeHabits={activeHabits}
          onToggleActiveHabit={toggleActiveHabit}
          targetDays={targetDays}
          habitConfigHistory={habitConfigHistory}
          onToggleTargetDay={toggleTargetDay}
          quantitySettings={quantitySettings}
          onUpdateQuantitySetting={updateQuantitySetting}
          onResetAllProgress={resetAllProgress}
          timeOffsetTick={timeOffsetTick}
          rankVisualTheme={rankVisualTheme}
          onRankVisualThemeChange={setRankVisualTheme}
          testRankOverride={testRankOverride}
          onApplySimulation={handleApplySimulation}
          onGenerateTestData={handleGenerateTestData}
          onApplyStatsPreset={handleApplyStatsPreset}
          onApplyTestRank={handleApplyTestRank}
          onApplyTimeOffset={handleApplyTimeOffset}
          cloudStatus={cloudStatus}
          lastCloudError={lastError}
          onAfterSignOut={handleAfterSignOut}
        />
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
