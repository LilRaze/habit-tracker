import { habits } from '../../../src/data/habits.js'
import { addDaysToDateStr, getWeekStartKey } from '../../../src/utils/progress.js'

/** Deterministic PRNG (seeded). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function weekDayToDateStr(weekMondayStr, dayIndex0to6) {
  return addDaysToDateStr(weekMondayStr, dayIndex0to6)
}

function defaultTargetDaysForHabit(habitName, profile) {
  const custom = profile?.targetDaysByHabit?.[habitName]
  if (Array.isArray(custom) && custom.length > 0) return [...new Set(custom)].sort((a, b) => a - b)
  const h = habits.find((x) => x.name === habitName)
  const n = h ? Number(h.defaultWeeklyTarget) || 7 : 7
  return Array.from({ length: Math.min(7, n) }, (_, i) => i)
}

/**
 * Build completions for all active habits across `totalWeeks` ending at virtual "now".
 * Reuses production week boundaries via getWeekStartKey / addDaysToDateStr.
 */
export function generateCompletions({ archetype, profile, totalWeeks, seed }) {
  const rng = mulberry32(seed)
  const activeHabits = profile.activeHabits
  const completions = {}
  activeHabits.forEach((name) => {
    completions[name] = []
  })

  const targetDays = {}
  activeHabits.forEach((name) => {
    targetDays[name] = defaultTargetDaysForHabit(name, profile)
  })

  const currentMonday = getWeekStartKey()
  const startMonday = addDaysToDateStr(currentMonday, -(totalWeeks - 1) * 7)

  for (let w = 0; w < totalWeeks; w += 1) {
    const weekMonday = addDaysToDateStr(startMonday, w * 7)

    activeHabits.forEach((habitName, habitIndex) => {
      const habit = habits.find((h) => h.name === habitName)
      const pool = targetDays[habitName]
      const targetLen = pool.length

      const ctx = {
        weekIndex: w,
        totalWeeks,
        habitIndex,
        habitName,
        habit,
        rng,
        profile,
        targetLen,
        pool,
        weekMonday,
      }

      if (archetype.modifiers?.currentWeekOnly && w !== totalWeeks - 1) {
        return
      }

      let ratio = archetype.computeRatio(ctx)
      if (typeof ratio !== 'number' || Number.isNaN(ratio)) ratio = 0

      if (archetype.modifiers?.boomBust) {
        const phase = w % 8
        ratio = phase < 4 ? 0.88 : 0.12
      }

      let desired = Math.round(ratio * targetLen)

      let pickPool = [...pool]
      if (archetype.modifiers?.overachiever) {
        pickPool = [0, 1, 2, 3, 4, 5, 6]
        desired = Math.min(7, Math.max(0, Math.round(ratio * 7)))
      } else if (ratio > 1 && !archetype.modifiers?.overachiever) {
        pickPool = [0, 1, 2, 3, 4, 5, 6]
        desired = Math.min(7, Math.max(0, Math.ceil(ratio * targetLen)))
      }

      if (desired <= 0) return

      shuffleInPlace(pickPool, rng)
      const days = pickPool.slice(0, Math.min(desired, pickPool.length))
      days.forEach((dayIdx) => {
        const dateStr = weekDayToDateStr(weekMonday, dayIdx)
        if (!completions[habitName].includes(dateStr)) {
          completions[habitName].push(dateStr)
        }
      })
    })
  }

  Object.keys(completions).forEach((k) => {
    completions[k].sort()
  })

  return { completions, targetDays, activeHabits }
}

export function countTotalCompletions(completions) {
  let n = 0
  Object.values(completions).forEach((arr) => {
    n += (arr ?? []).length
  })
  return n
}

export function countCompletionsInCurrentWeek(completions, activeHabits) {
  const currentMonday = getWeekStartKey()
  let n = 0
  ;(activeHabits ?? []).forEach((name) => {
    const dates = completions?.[name] ?? []
    dates.forEach((d) => {
      const dt = new Date(d + 'T12:00:00')
      const ref = new Date(currentMonday + 'T12:00:00')
      const mon = new Date(ref)
      mon.setHours(0, 0, 0, 0)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      sun.setHours(23, 59, 59, 999)
      if (dt >= mon && dt <= sun) n += 1
    })
  })
  return n
}
