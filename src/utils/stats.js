import { habits } from '../data/habits'
import { CORE_STATS } from '../data/stats'
import { getStatKeysForHabit } from '../data/habitStatMapping'
import { getCountForWeekStart, getWeekStartKey, addDaysToDateStr } from './progress'
import { rawStatToDisplay } from './statsConversion'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function toTrackedHabitSet(activeHabits) {
  const validNames = new Set(habits.map((h) => h.name))
  const set = new Set(activeHabits ?? [])
  return [...set].filter((habitName) => validNames.has(habitName))
}

function getFirstTrackedWeekStart(trackedHabits, completions) {
  const allDates = []
  trackedHabits.forEach((habitName) => {
    const dates = completions?.[habitName] ?? []
    dates.forEach((d) => {
      if (typeof d === 'string' && DATE_RE.test(d)) {
        allDates.push(d)
      }
    })
  })
  if (allDates.length === 0) return null
  const firstDate = allDates.reduce((a, b) => (a < b ? a : b))
  return getWeekStartKey(new Date(firstDate + 'T12:00:00'))
}

function getWeeklyStatMultiplier(weekIndex) {
  // weekIndex is 0-based; weekNum is 1-based
  const weekNum = weekIndex + 1
  if (weekNum <= 4) return 2.0
  if (weekNum <= 8) return 1.8
  if (weekNum <= 12) return 1.6
  if (weekNum <= 24) return 1.4
  if (weekNum <= 52) return 1.2
  return 1.0
}

export function deriveLongTermStats(completions, targetDays, activeHabits) {
  const trackedHabits = toTrackedHabitSet(activeHabits).filter(
    (habitName) => getStatKeysForHabit(habitName).length > 0
  )

  const rawTotals = {
    strength: 0,
    health: 0,
    intelligence: 0,
    discipline: 0,
  }

  if (trackedHabits.length === 0) {
    return { strength: 0, health: 0, intelligence: 0, discipline: 0, overall: 0 }
  }

  const currentWeekStart = getWeekStartKey()
  const firstWeekStart = getFirstTrackedWeekStart(trackedHabits, completions)

  if (!firstWeekStart) {
    return { strength: 0, health: 0, intelligence: 0, discipline: 0, overall: 0 }
  }

  let weekStart = firstWeekStart
  let weekIndex = 0

  while (weekStart <= currentWeekStart) {
    const multiplier = getWeeklyStatMultiplier(weekIndex)

    trackedHabits.forEach((habitName) => {
      const statKeys = getStatKeysForHabit(habitName)
      if (statKeys.length === 0) return
      const weeklyCount = getCountForWeekStart(completions?.[habitName] ?? [], weekStart)
      if (weeklyCount <= 0) return

      statKeys.forEach((statKey) => {
        rawTotals[statKey] += weeklyCount * multiplier
      })
    })

    weekStart = addDaysToDateStr(weekStart, 7)
    weekIndex += 1
  }

  const strength = rawStatToDisplay(rawTotals.strength)
  const health = rawStatToDisplay(rawTotals.health)
  const intelligence = rawStatToDisplay(rawTotals.intelligence)
  const discipline = rawStatToDisplay(rawTotals.discipline)
  const overall = Math.round((strength + health + intelligence + discipline) / 4)

  return { strength, health, intelligence, discipline, overall }
}
