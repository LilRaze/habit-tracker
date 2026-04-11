/**
 * Simulation-only: same outputs as deriveRanksV4, but O(n) per habit for date→week bucketing
 * instead of O(n × weeks) getCountForWeekStart scans.
 */
import { habits } from '../../../src/data/habits.js'
import {
  interpolateWeeklyGain,
  progressToRank,
} from '../../../src/utils/rankEngineV4.js'
import {
  resolveHabitConfigAtDate,
  weeklyTargetFromSelectedDays,
} from '../../../src/utils/habitConfigHistory.js'
import { addDaysToDateStr, getWeekStartKey } from '../../../src/utils/progress.js'

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function hasHabitConfigHistory(habitConfigHistory) {
  return habitConfigHistory && typeof habitConfigHistory === 'object' && Object.keys(habitConfigHistory).length > 0
}

function computeWeeklyRatiosBucketed(
  dates,
  habit,
  habitName,
  habitConfigHistory,
  fallbackTargets,
  fallbackActive
) {
  const dateHistory = Array.isArray(dates) ? dates.slice().sort() : []
  if (dateHistory.length === 0) {
    return { ratios: [], weeksEvaluated: 0 }
  }

  const bucket = new Map()
  dateHistory.forEach((d) => {
    const ws = getWeekStartKey(new Date(d + 'T12:00:00'))
    bucket.set(ws, (bucket.get(ws) || 0) + 1)
  })

  const currentWeekStart = getWeekStartKey()
  const firstDateStr = dateHistory[0]
  let weekStart = getWeekStartKey(new Date(firstDateStr + 'T12:00:00'))

  const ratios = []
  const useHistory = hasHabitConfigHistory(habitConfigHistory)

  while (weekStart <= currentWeekStart) {
    let cfg
    if (useHistory) {
      cfg = resolveHabitConfigAtDate(
        habitName,
        weekStart,
        habitConfigHistory,
        habit,
        fallbackTargets,
        fallbackActive
      )
    } else {
      cfg = {
        isActive: true,
        targetDays: Array.isArray(fallbackTargets) ? fallbackTargets : [],
      }
    }

    if (!cfg.isActive) {
      weekStart = addDaysToDateStr(weekStart, 7)
      continue
    }

    const completed = bucket.get(weekStart) || 0
    const weeklyTarget = weeklyTargetFromSelectedDays(cfg.targetDays, habit)

    if (weeklyTarget > 0) {
      const ratio = clamp01((Number(completed) || 0) / weeklyTarget)
      ratios.push(ratio)
    }

    weekStart = addDaysToDateStr(weekStart, 7)
  }

  return { ratios, weeksEvaluated: ratios.length }
}

/** Drop-in replacement for deriveRanksV4 with identical return shape. */
export function deriveRanksV4Sim(completions, targetDays, activeHabits, habitConfigHistory) {
  const result = {}
  const activeKeys = new Set(activeHabits ?? [])

  habits.forEach((habit) => {
    const key = habit.id || habit.name
    if (!activeKeys.has(habit.name) && !activeKeys.has(key)) {
      return
    }

    const datesByName = completions?.[habit.name] ?? []
    const datesById = completions?.[key] ?? []
    const dates =
      datesById.length >= datesByName.length ? datesById : datesByName

    const targetByName = targetDays?.[habit.name]
    const targetById = targetDays?.[key]
    const targets =
      Array.isArray(targetById) && targetById.length > 0
        ? targetById
        : targetByName

    const fallbackActive = activeKeys.has(habit.name) || activeKeys.has(key)

    const { ratios, weeksEvaluated } = computeWeeklyRatiosBucketed(
      dates,
      habit,
      habit.name,
      habitConfigHistory,
      targets,
      fallbackActive
    )
    if (weeksEvaluated === 0) {
      result[key] = {
        rank: 'Unranked',
        lp: 0,
        habitId: habit.id,
        habitName: habit.name,
        weeksEvaluated: 0,
        progressValue: 0,
      }
      return
    }

    let totalProgress = 0
    for (let i = 0; i < ratios.length; i += 1) {
      const weekNumber = i + 1
      const weeklyLp = interpolateWeeklyGain(ratios[i], weekNumber)
      totalProgress += weeklyLp
    }

    const { rank, lp } = progressToRank(totalProgress)

    result[key] = {
      rank,
      lp,
      habitId: habit.id,
      habitName: habit.name,
      weeksEvaluated,
      progressValue: totalProgress,
    }
  })

  const entries = Object.values(result)
  if (entries.length === 0) {
    return {
      overall: { rank: 'Unranked', lp: 0, progressValue: 0 },
      habits: [],
    }
  }

  const avgProgress = Math.round(
    entries.reduce((sum, h) => sum + (h.progressValue || 0), 0) / entries.length
  )
  const overall = {
    ...progressToRank(avgProgress),
    progressValue: avgProgress,
  }

  return {
    overall,
    habits: entries,
  }
}
