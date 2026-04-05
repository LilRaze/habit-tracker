/**
 * Simulation-only: same outputs as deriveRanksV4, but O(n) per habit for date→week bucketing
 * instead of O(n × weeks) getCountForWeekStart scans.
 */
import { habits } from '../../../src/data/habits.js'
import {
  interpolateWeeklyGain,
  progressToRank,
} from '../../../src/utils/rankEngineV4.js'
import { addDaysToDateStr, getWeekStartKey } from '../../../src/utils/progress.js'

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function computeWeeklyRatiosBucketed(dates, habit, targetDaysForHabit) {
  const history = Array.isArray(dates) ? dates.slice().sort() : []
  if (history.length === 0) {
    return { ratios: [], weeksEvaluated: 0 }
  }

  const bucket = new Map()
  history.forEach((d) => {
    const ws = getWeekStartKey(new Date(d + 'T12:00:00'))
    bucket.set(ws, (bucket.get(ws) || 0) + 1)
  })

  const currentWeekStart = getWeekStartKey()
  const firstDateStr = history[0]
  let weekStart = getWeekStartKey(new Date(firstDateStr + 'T12:00:00'))

  const ratios = []
  while (weekStart <= currentWeekStart) {
    const completed = bucket.get(weekStart) || 0
    const selectedCount = Array.isArray(targetDaysForHabit)
      ? targetDaysForHabit.length
      : 0
    const weeklyTarget =
      selectedCount && selectedCount > 0
        ? selectedCount
        : Number(habit.defaultWeeklyTarget) || 0

    if (weeklyTarget > 0) {
      const ratio = clamp01((Number(completed) || 0) / weeklyTarget)
      ratios.push(ratio)
    }

    weekStart = addDaysToDateStr(weekStart, 7)
  }

  return { ratios, weeksEvaluated: ratios.length }
}

/** Drop-in replacement for deriveRanksV4 with identical return shape. */
export function deriveRanksV4Sim(completions, targetDays, activeHabits) {
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

    const { ratios, weeksEvaluated } = computeWeeklyRatiosBucketed(
      dates,
      habit,
      targets
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
