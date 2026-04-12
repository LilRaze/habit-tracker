/**
 * Weekly target schedule only: which `targetDays` apply from which Monday (`effectiveFrom`).
 * New user edits take effect on the **Monday after the current week** (see `getNextWeekMondayDateStr`).
 *
 * @typedef {Record<string, Array<{ effectiveFrom: string, targetDays: number[] }>>} HabitTargetHistory
 */
import { habits } from '../data/habits'
import { sortUniqueDayIndices } from './habitConfigHistory'
import { addDaysToDateStr, getWeekStartKey } from './progress'

/** Covers all calendar weeks before any explicit segment. */
export const HABIT_TARGET_HISTORY_EPOCH = '2000-01-01'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** @typedef {{ effectiveFrom: string, targetDays: number[] }} HabitTargetSegment */
/** @typedef {Record<string, HabitTargetSegment[]>} HabitTargetHistory */

/** Monday that starts the calendar week after the current Mon–Sun week. */
export function getNextWeekMondayDateStr() {
  return addDaysToDateStr(getWeekStartKey(), 7)
}

function isValidSegment(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.effectiveFrom === 'string' &&
    DATE_RE.test(e.effectiveFrom) &&
    Array.isArray(e.targetDays)
  )
}

/**
 * @param {unknown} raw
 * @returns {HabitTargetHistory}
 */
export function parseHabitTargetHistory(raw) {
  if (!raw || typeof raw !== 'object') return {}
  /** @type {HabitTargetHistory} */
  const out = {}
  habits.forEach((h) => {
    const list = raw[h.name]
    if (!Array.isArray(list)) return
    const cleaned = list
      .filter(isValidSegment)
      .map((e) => ({
        effectiveFrom: e.effectiveFrom,
        targetDays: sortUniqueDayIndices(e.targetDays),
      }))
    cleaned.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    if (cleaned.length > 0) out[h.name] = cleaned
  })
  return out
}

/**
 * One segment per habit at epoch when missing (matches current Targets for migration).
 * @param {unknown} raw
 * @param {Record<string, number[]>} targetDays
 * @returns {HabitTargetHistory}
 */
export function ensureHabitTargetHistoryShape(raw, targetDays) {
  const parsed = parseHabitTargetHistory(raw)
  /** @type {HabitTargetHistory} */
  const out = { ...parsed }
  habits.forEach((h) => {
    if (out[h.name] && out[h.name].length > 0) return
    const td = targetDays?.[h.name]
    out[h.name] = [
      {
        effectiveFrom: HABIT_TARGET_HISTORY_EPOCH,
        targetDays: sortUniqueDayIndices(Array.isArray(td) ? td : []),
      },
    ]
  })
  return out
}

/**
 * Target days used for the Mon–Sun week that starts on `weekStartStr` (YYYY-MM-DD Monday).
 * @param {string} habitName
 * @param {string} weekStartStr
 * @param {HabitTargetHistory | null | undefined} habitTargetHistory
 * @param {number[]|undefined} fallbackTargets — current `targetDays` row for this habit
 */
export function resolveTargetDaysForWeekStart(habitName, weekStartStr, habitTargetHistory, fallbackTargets) {
  const list = habitTargetHistory?.[habitName]
  if (!Array.isArray(list) || list.length === 0) {
    return Array.isArray(fallbackTargets) ? fallbackTargets : []
  }
  const sorted = [...list].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  let chosen = null
  for (let i = 0; i < sorted.length; i += 1) {
    const e = sorted[i]
    if (e.effectiveFrom <= weekStartStr) chosen = e
    else break
  }
  if (!chosen) {
    return Array.isArray(fallbackTargets) ? fallbackTargets : []
  }
  return sortUniqueDayIndices(chosen.targetDays)
}

/**
 * Schedule `newTargetDays` for the Monday after this week; past weeks keep older segments.
 * @param {HabitTargetHistory | null | undefined} history
 * @param {string} habitName
 * @param {number[]} previousTargetDays — habit’s target days **before** this edit
 * @param {number[]} newTargetDays
 * @returns {HabitTargetHistory}
 */
export function recordTargetChangeScheduledForNextWeek(history, habitName, previousTargetDays, newTargetDays) {
  const base = history && typeof history === 'object' ? { ...history } : {}
  const nextMon = getNextWeekMondayDateStr()
  const prev = sortUniqueDayIndices(previousTargetDays)
  const next = sortUniqueDayIndices(newTargetDays)
  if (prev.length === next.length && prev.every((d, i) => d === next[i])) {
    return base
  }

  let list = [...(base[habitName] ?? [])].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  if (list.length === 0) {
    list = [{ effectiveFrom: HABIT_TARGET_HISTORY_EPOCH, targetDays: prev }]
  }

  const withoutPending = list.filter((e) => e.effectiveFrom !== nextMon)
  withoutPending.push({ effectiveFrom: nextMon, targetDays: next })
  withoutPending.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  base[habitName] = withoutPending
  return base
}
