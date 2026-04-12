import { habits } from '../../../src/data/habits.js'
import { getStatKeysForHabit } from '../../../src/data/habitStatMapping.js'
import { getCountForWeekStart, addDaysToDateStr, getWeekStartKey } from '../../../src/utils/progress.js'
import { deriveRanksV4 } from '../../../src/utils/rankEngineV4.js'
import { STATS_CURVE_K } from '../../../src/data/stats.js'
import { deriveLongTermStats } from '../../../src/utils/stats.js'
import {
  deriveLongTermStatsDisplayFromRaw,
  internalStatToPercent,
} from '../../../src/utils/statsConversion.js'

/** Mirrors `getWeeklyStatMultiplier` in production stats.js (not exported). */
export function getWeeklyStatMultiplier(weekIndex) {
  const weekNum = weekIndex + 1
  if (weekNum <= 4) return 2.0
  if (weekNum <= 8) return 1.8
  if (weekNum <= 12) return 1.6
  if (weekNum <= 24) return 1.4
  if (weekNum <= 52) return 1.2
  return 1.0
}

function toTrackedHabitSet(activeHabits) {
  const validNames = new Set(habits.map((h) => h.name))
  const set = new Set(activeHabits ?? [])
  return [...set].filter((habitName) => validNames.has(habitName))
}

/**
 * Per-habit raw contribution to each stat bucket (before global exp curve).
 * Same loop semantics as deriveLongTermStats but accumulates per habitName.
 */
export function computePerHabitRawStatBuckets(completions, activeHabits) {
  const trackedHabits = toTrackedHabitSet(activeHabits).filter(
    (habitName) => getStatKeysForHabit(habitName).length > 0
  )
  const perHabit = {}
  trackedHabits.forEach((name) => {
    perHabit[name] = { strength: 0, health: 0, intelligence: 0, discipline: 0 }
  })

  if (trackedHabits.length === 0) {
    return { perHabit, firstWeekStart: null, currentWeekStart: getWeekStartKey() }
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const allDates = []
  trackedHabits.forEach((habitName) => {
    const dates = completions?.[habitName] ?? []
    dates.forEach((d) => {
      if (typeof d === 'string' && DATE_RE.test(d)) allDates.push(d)
    })
  })
  if (allDates.length === 0) {
    return { perHabit, firstWeekStart: null, currentWeekStart: getWeekStartKey() }
  }
  const firstDate = allDates.reduce((a, b) => (a < b ? a : b))
  const firstWeekStart = getWeekStartKey(new Date(firstDate + 'T12:00:00'))
  const currentWeekStart = getWeekStartKey()

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
        perHabit[habitName][statKey] += weeklyCount * multiplier
      })
    })
    weekStart = addDaysToDateStr(weekStart, 7)
    weekIndex += 1
  }

  return { perHabit, firstWeekStart, currentWeekStart }
}

/** Week starts from first completion week through current week (matches rankEngineV4). */
export function getRankEvaluatedWeekStarts(firstDateStr) {
  const currentWeekStart = getWeekStartKey()
  if (!firstDateStr) return []
  let weekStart = getWeekStartKey(new Date(firstDateStr + 'T12:00:00'))
  const out = []
  while (weekStart <= currentWeekStart) {
    out.push(weekStart)
    weekStart = addDaysToDateStr(weekStart, 7)
  }
  return out
}

/**
 * Average adherence ratio across (habit × rank-evaluated week) cells.
 * Uses same weeklyTarget rule as rankEngineV4: targetDays length or defaultWeeklyTarget.
 */
export function computeAverageAdherenceRatio(completions, targetDays, activeHabits) {
  const activeKeys = new Set(activeHabits ?? [])
  let sum = 0
  let n = 0

  habits.forEach((habit) => {
    if (!activeKeys.has(habit.name)) return
    const dates = completions?.[habit.name] ?? []
    if (dates.length === 0) return

    const sorted = [...dates].sort()
    const firstDateStr = sorted[0]
    const rankWeeks = getRankEvaluatedWeekStarts(firstDateStr)

    const targetByName = targetDays?.[habit.name]
    const weeklyTarget =
      Array.isArray(targetByName) && targetByName.length > 0
        ? targetByName.length
        : Number(habit.defaultWeeklyTarget) || 0

    if (weeklyTarget <= 0) return

    const bucket = new Map()
    sorted.forEach((d) => {
      const ws = getWeekStartKey(new Date(d + 'T12:00:00'))
      bucket.set(ws, (bucket.get(ws) || 0) + 1)
    })

    rankWeeks.forEach((ws) => {
      const completed = bucket.get(ws) || 0
      const ratio = Math.min(1, Math.max(0, completed / weeklyTarget))
      sum += ratio
      n += 1
    })
  })

  return n > 0 ? sum / n : null
}

export function statsToPercentDisplay(derived) {
  return {
    overall: internalStatToPercent(derived.overall),
    health: internalStatToPercent(derived.health),
    strength: internalStatToPercent(derived.strength),
    intelligence: internalStatToPercent(derived.intelligence),
    discipline: internalStatToPercent(derived.discipline),
  }
}

export function runProductionStatsAndRank(completions, targetDays, activeHabits) {
  const derived = deriveLongTermStats(completions, targetDays, activeHabits)
  const rankData = deriveRanksV4(completions, targetDays, activeHabits, undefined)
  return { derived, rankData }
}

/**
 * Single pass: same raw totals as deriveLongTermStats + per-habit raw buckets (simulation-only).
 * Avoids duplicating the full stats week loop twice per run.
 */
export function deriveLongTermStatsWithPerHabitRaw(completions, targetDays, activeHabits) {
  const trackedHabits = toTrackedHabitSet(activeHabits).filter(
    (habitName) => getStatKeysForHabit(habitName).length > 0
  )

  const rawTotals = {
    strength: 0,
    health: 0,
    intelligence: 0,
    discipline: 0,
  }

  const perHabit = {}
  trackedHabits.forEach((name) => {
    perHabit[name] = { strength: 0, health: 0, intelligence: 0, discipline: 0 }
  })

  if (trackedHabits.length === 0) {
    return {
      derived: { strength: 0, health: 0, intelligence: 0, discipline: 0, overall: 0 },
      perHabit,
    }
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const allDates = []
  trackedHabits.forEach((habitName) => {
    const dates = completions?.[habitName] ?? []
    dates.forEach((d) => {
      if (typeof d === 'string' && DATE_RE.test(d)) allDates.push(d)
    })
  })
  if (allDates.length === 0) {
    return {
      derived: { strength: 0, health: 0, intelligence: 0, discipline: 0, overall: 0 },
      perHabit,
    }
  }
  const firstDate = allDates.reduce((a, b) => (a < b ? a : b))
  const firstWeekStart = getWeekStartKey(new Date(firstDate + 'T12:00:00'))
  const currentWeekStart = getWeekStartKey()

  const buckets = {}
  trackedHabits.forEach((habitName) => {
    const m = new Map()
    const dates = completions?.[habitName] ?? []
    dates.forEach((d) => {
      if (typeof d !== 'string' || !DATE_RE.test(d)) return
      const ws = getWeekStartKey(new Date(d + 'T12:00:00'))
      m.set(ws, (m.get(ws) || 0) + 1)
    })
    buckets[habitName] = m
  })

  let weekStart = firstWeekStart
  let weekIndex = 0
  while (weekStart <= currentWeekStart) {
    const multiplier = getWeeklyStatMultiplier(weekIndex)
    trackedHabits.forEach((habitName) => {
      const statKeys = getStatKeysForHabit(habitName)
      if (statKeys.length === 0) return
      const weeklyCount = buckets[habitName].get(weekStart) || 0
      if (weeklyCount <= 0) return
      statKeys.forEach((statKey) => {
        const add = weeklyCount * multiplier
        rawTotals[statKey] += add
        perHabit[habitName][statKey] += add
      })
    })
    weekStart = addDaysToDateStr(weekStart, 7)
    weekIndex += 1
  }

  const derived = deriveLongTermStatsDisplayFromRaw(rawTotals, STATS_CURVE_K)

  return {
    derived,
    perHabit,
  }
}

export { deriveLongTermStats, deriveRanksV4, internalStatToPercent }
