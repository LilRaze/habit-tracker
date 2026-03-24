import { habits } from '../data/habits'
import { CORE_STATS, HABIT_STAT_WEIGHTS, STATS_CALIBRATION } from '../data/stats'
import { getCountForWeekStart, getWeekStartKey, addDaysToDateStr } from './progress'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getHabitByName(habitName) {
  return habits.find((h) => h.name === habitName)
}

function getWeekProgressForHabit(habitName, completions, targetDays, weekStart) {
  const habit = getHabitByName(habitName)
  if (!habit) return 0
  const completed = getCountForWeekStart(completions?.[habitName] ?? [], weekStart)
  const selectedTargetCount = targetDays?.[habitName]?.length
  const target = selectedTargetCount != null && selectedTargetCount > 0
    ? selectedTargetCount
    : habit.defaultWeeklyTarget
  if (target <= 0) return 0
  const rawProgress = completed / target
  return clamp(rawProgress, 0, STATS_CALIBRATION.maxOverTargetCredit)
}

function getFirstTrackedWeekStart(activeHabits, completions) {
  const allDates = []
  activeHabits.forEach((habitName) => {
    const habitDates = completions?.[habitName] ?? []
    allDates.push(...habitDates)
  })
  if (allDates.length === 0) return null
  const firstDate = allDates.reduce((a, b) => (a < b ? a : b))
  return getWeekStartKey(new Date(firstDate + 'T12:00:00'))
}

export function deriveLongTermStats(completions, targetDays, activeHabits) {
  const trackedHabits = (activeHabits ?? []).filter(
    (habitName) => getHabitByName(habitName) && HABIT_STAT_WEIGHTS[habitName]
  )

  const totals = {}
  CORE_STATS.forEach((stat) => {
    totals[stat] = 0
  })

  if (trackedHabits.length === 0) {
    return { strength: 0, health: 0, intelligence: 0, discipline: 0, overall: 0 }
  }

  const currentWeekStart = getWeekStartKey()
  const firstWeekStart = getFirstTrackedWeekStart(trackedHabits, completions)
  if (!firstWeekStart) {
    return { strength: 0, health: 0, intelligence: 0, discipline: 0, overall: 0 }
  }

  let weekStart = firstWeekStart
  while (weekStart <= currentWeekStart) {
    CORE_STATS.forEach((stat) => {
      let weightedProgressSum = 0
      let totalWeight = 0

      trackedHabits.forEach((habitName) => {
        const weight = HABIT_STAT_WEIGHTS[habitName]?.[stat] ?? 0
        if (weight <= 0) return
        const weekProgress = getWeekProgressForHabit(habitName, completions, targetDays, weekStart)
        weightedProgressSum += weekProgress * weight
        totalWeight += weight
      })

      if (totalWeight > 0) {
        const normalizedWeekProgress = weightedProgressSum / totalWeight
        totals[stat] += normalizedWeekProgress * STATS_CALIBRATION.weeklyBaseGain
      }
    })

    weekStart = addDaysToDateStr(weekStart, 7)
  }

  const strength = Math.round(clamp(totals.strength, 0, 100))
  const health = Math.round(clamp(totals.health, 0, 100))
  const intelligence = Math.round(clamp(totals.intelligence, 0, 100))
  const discipline = Math.round(clamp(totals.discipline, 0, 100))
  const overall = Math.round((strength + health + intelligence + discipline) / 4)

  return { strength, health, intelligence, discipline, overall }
}
