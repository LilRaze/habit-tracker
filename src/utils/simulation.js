import { habits } from '../data/habits'
import { ensureHabitTargetHistoryShape } from './habitTargetHistory'
import { getNow, getTodayDateString } from './now'
import { addDaysToDateStr, getWeekStartKey } from './progress'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function dateStrToDate(dateStr) {
  return new Date(dateStr + 'T12:00:00')
}

function toLocalDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clampInt(value, min, max) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function hashStringToInt(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleDeterministic(list, rng) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getInitialTargetDays() {
  const data = {}
  habits.forEach((h) => {
    const count = clampInt(h.defaultWeeklyTarget, 0, 7)
    data[h.name] = Array.from({ length: count }, (_, i) => i)
  })
  return data
}

function getInitialCompletions() {
  const data = {}
  habits.forEach((h) => {
    data[h.name] = []
  })
  return data
}

function getInitialQuantitySettings() {
  const data = {}
  habits.forEach((h) => {
    data[h.name] = ''
  })
  return data
}

function clampDateStr(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr)) return null
  return dateStr
}

function generateWeekCompletionDates({
  weekStartStr,
  habitName,
  weekIndex,
  achievedPerWeek,
  startDateStr,
  todayDateStr,
}) {
  const achieved = clampInt(achievedPerWeek, 0, 7)
  const availableOffsets = []
  for (let offset = 0; offset <= 6; offset += 1) {
    const dateStr = addDaysToDateStr(weekStartStr, offset)
    if (dateStr < startDateStr) continue
    if (dateStr > todayDateStr) continue
    availableOffsets.push(offset)
  }

  if (achieved === 0 || availableOffsets.length === 0) return []

  const targetCount = Math.min(achieved, availableOffsets.length)
  const seed = hashStringToInt(`${habitName}|${weekIndex}`)
  const rng = mulberry32(seed)
  const shuffled = shuffleDeterministic(availableOffsets, rng)
  const chosenOffsets = shuffled.slice(0, targetCount)

  return chosenOffsets
    .map((off) => addDaysToDateStr(weekStartStr, off))
    .sort()
}

/**
 * Generate a realistic (but controllable) history by simulating completions week-by-week.
 *
 * @param {{
 *   months: number,
 *   selectedHabits: string[],
 *   targetsByHabit: Record<string, number>,
 *   achievedByHabit: Record<string, number>,
 *   forcePerfect?: boolean
 * }} args
 * @returns {{ completions: Record<string, string[]>, targetDays: Record<string, number[]>, activeHabits: string[], habitConfigHistory: Record<string, never>, quantitySettings: Record<string, string> }}
 */
export function generateSimulationHistory({
  months,
  selectedHabits,
  targetsByHabit,
  achievedByHabit,
  forcePerfect = false,
}) {
  const monthsCount = Math.max(1, Math.min(60, Math.floor(Number(months)) || 1))

  const now = getNow()
  const endDateStr = toLocalDateString(now)
  const todayDateStr = getTodayDateString()
  const endClamped = clampDateStr(endDateStr) ?? todayDateStr

  const start = new Date(now.getTime())
  start.setMonth(start.getMonth() - monthsCount)
  const startDateStr = toLocalDateString(start)

  const startWeekStart = getWeekStartKey(start)
  const currentWeekStart = getWeekStartKey(now)

  const validHabits = new Set(habits.map((h) => h.name))
  const selected = (selectedHabits ?? []).filter((h) => validHabits.has(h))

  const targetDays = getInitialTargetDays()
  selected.forEach((habitName) => {
    const rawTarget = targetsByHabit?.[habitName]
    const targetCount = clampInt(rawTarget, 0, 7)
    // Targets page uses these indices; rank/stats uses only the array length.
    targetDays[habitName] = targetCount > 0
      ? Array.from({ length: targetCount }, (_, i) => i)
      : []
  })

  const completions = getInitialCompletions()

  selected.forEach((habitName) => {
    const rawTarget = targetsByHabit?.[habitName]
    const targetCount = clampInt(rawTarget, 0, 7)
    const achievedSetting = achievedByHabit?.[habitName]
    const baseAchieved = achievedSetting != null ? clampInt(achievedSetting, 0, 7) : 0
    const achievedPerWeekValue = forcePerfect
      ? clampInt(Math.max(baseAchieved, targetCount), 0, 7)
      : baseAchieved

    let weekIndex = 0
    for (let weekStart = startWeekStart; weekStart <= currentWeekStart; weekStart = addDaysToDateStr(weekStart, 7)) {
      const weekCompletionDates = generateWeekCompletionDates({
        weekStartStr: weekStart,
        habitName,
        weekIndex,
        achievedPerWeek: achievedPerWeekValue,
        startDateStr,
        todayDateStr: endClamped,
      })
      if (weekCompletionDates.length > 0) {
        completions[habitName] = [...completions[habitName], ...weekCompletionDates]
      }
      weekIndex += 1
    }

    // Ensure sorted unique (duplicates shouldn't happen, but be safe).
    const set = new Set(completions[habitName])
    completions[habitName] = [...set].sort()
  })

  const activeHabits = [...selected]
  const quantitySettings = getInitialQuantitySettings()
  return {
    completions,
    targetDays,
    activeHabits,
    habitConfigHistory: {},
    habitTargetHistory: ensureHabitTargetHistoryShape(null, targetDays),
    quantitySettings,
  }
}

