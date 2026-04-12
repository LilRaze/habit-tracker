import { habits } from '../data/habits'
import { ensureHabitTargetHistoryShape } from './habitTargetHistory'
import { addDaysToDateStr } from './progress'
import { getNow } from './now'

function emptyCompletions() {
  const o = {}
  habits.forEach((h) => {
    o[h.name] = []
  })
  return o
}

function dateToLocalDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayIndexMon0(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`)
  return (d.getDay() + 6) % 7
}

function defaultTargetDaysForHabit(habit) {
  const n = Math.min(7, Math.max(1, habit.defaultWeeklyTarget))
  return Array.from({ length: n }, (_, i) => i)
}

function randomTargetDays(habit) {
  const want = Math.min(
    7,
    Math.max(2, Math.min(habit.defaultWeeklyTarget, 3 + Math.floor(Math.random() * 3)))
  )
  const idx = [0, 1, 2, 3, 4, 5, 6]
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx.slice(0, want).sort((a, b) => a - b)
}

const PRESET_PROB = {
  0: 0.02,
  25: 0.28,
  50: 0.52,
  75: 0.78,
  100: 0.97,
}

/**
 * @param {number} months - how far back to generate
 * @param {{ preset?: 0 | 25 | 50 | 75 | 100, mixed?: boolean }} [profile]
 * @returns {{ completions: Object, targetDays: Object, activeHabits: string[], habitConfigHistory: Record<string, never>, quantitySettings: Object }}
 */
export function generateTestHabitData(months, profile = {}) {
  const monthsCount = Math.max(1, Math.min(48, Math.floor(Number(months)) || 6))
  const preset = profile.preset
  const useMixed = preset == null && profile.mixed !== false

  const end = getNow()
  const start = new Date(end.getTime())
  start.setMonth(start.getMonth() - monthsCount)
  const startStr = dateToLocalDateString(start)
  const endStr = dateToLocalDateString(end)

  const shuffled = [...habits].sort(() => Math.random() - 0.5)
  const count = 8 + Math.floor(Math.random() * 5)
  const activeHabits = shuffled.slice(0, Math.min(count, habits.length)).map((h) => h.name)

  const completions = emptyCompletions()
  const targetDays = {}
  const quantitySettings = {}

  habits.forEach((h) => {
    if (activeHabits.includes(h.name)) {
      targetDays[h.name] = randomTargetDays(h)
      quantitySettings[h.name] = h.hasQuantity
        ? String(4 + Math.floor(Math.random() * 8))
        : ''
    } else {
      targetDays[h.name] = defaultTargetDaysForHabit(h)
      quantitySettings[h.name] = ''
    }
  })

  const dates = []
  let d = startStr
  while (d <= endStr) {
    dates.push(d)
    d = addDaysToDateStr(d, 1)
  }

  activeHabits.forEach((name, hi) => {
    const habit = habits.find((x) => x.name === name)
    if (!habit) return
    const tdays = targetDays[name] ?? []
    dates.forEach((dateStr) => {
      const di = dayIndexMon0(dateStr)
      if (!tdays.includes(di)) return

      let p
      if (preset != null && PRESET_PROB[preset] != null) {
        p = PRESET_PROB[preset]
      } else if (useMixed) {
        const band = hi % 3
        p = band === 0 ? 0.86 : band === 1 ? 0.58 : 0.34
      } else {
        p = 0.55
      }

      if (Math.random() < p) {
        const list = completions[name] ?? []
        if (!list.includes(dateStr)) {
          completions[name] = [...list, dateStr].sort()
        }
      }
    })
  })

  return {
    completions,
    targetDays,
    activeHabits,
    habitConfigHistory: {},
    habitTargetHistory: ensureHabitTargetHistoryShape(null, targetDays),
    quantitySettings,
  }
}

/**
 * @param {0 | 25 | 50 | 75 | 100} level
 */
export function applyStatsPreset(level) {
  return generateTestHabitData(12, { preset: level })
}
