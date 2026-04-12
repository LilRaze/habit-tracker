/**
 * Per-habit configuration history for rank evaluation.
 *
 * Each habit has a sorted list of segments `{ effectiveFrom, isActive, targetDays }`.
 * `effectiveFrom` is YYYY-MM-DD (local calendar, same as completions / getTodayDateString).
 *
 * Migration assumption (documented): for existing users with no stored history, we seed one
 * segment per habit at HABIT_CONFIG_HISTORY_EPOCH with **current** active + targetDays.
 * That preserves the legacy engine behavior for all past weeks until the user changes config
 * after upgrade; from that change's effective date onward, past weeks use the correct segment.
 */
import { habits } from '../data/habits'

/** Baseline date for migrated / default history (covers all prior calendar weeks). */
export const HABIT_CONFIG_HISTORY_EPOCH = '2000-01-01'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** @typedef {{ effectiveFrom: string, isActive: boolean, targetDays: number[] }} HabitConfigEntry */
/** @typedef {Record<string, HabitConfigEntry[]>} HabitConfigHistory */

export function defaultTargetDayIndicesForHabit(habit) {
  const n = Number(habit.defaultWeeklyTarget) || 0
  return Array.from({ length: Math.max(0, n) }, (_, i) => i)
}

export function sortUniqueDayIndices(days) {
  if (!Array.isArray(days)) return []
  const valid = days.filter((d) => typeof d === 'number' && d >= 0 && d <= 6 && Number.isInteger(d))
  return [...new Set(valid)].sort((a, b) => a - b)
}

function habitByName(name) {
  return habits.find((h) => h.name === name) ?? null
}

function normalizedTargetsForHabit(habitName, targetDaysRecord, activeSet) {
  const habit = habitByName(habitName)
  if (!habit) return []
  const raw = targetDaysRecord?.[habitName]
  if (Array.isArray(raw) && raw.length > 0) return sortUniqueDayIndices(raw)
  if (activeSet.has(habitName)) return defaultTargetDayIndicesForHabit(habit)
  return defaultTargetDayIndicesForHabit(habit)
}

function isValidEntry(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.effectiveFrom === 'string' &&
    DATE_RE.test(e.effectiveFrom) &&
    typeof e.isActive === 'boolean' &&
    Array.isArray(e.targetDays)
  )
}

/**
 * Normalize raw persisted history: valid entries only, sorted per habit.
 * @param {unknown} raw
 * @returns {HabitConfigHistory}
 */
export function parseHabitConfigHistory(raw) {
  if (!raw || typeof raw !== 'object') return {}
  /** @type {HabitConfigHistory} */
  const out = {}
  habits.forEach((h) => {
    const list = raw[h.name]
    if (!Array.isArray(list)) return
    const cleaned = list.filter(isValidEntry).map((e) => ({
      effectiveFrom: e.effectiveFrom,
      isActive: e.isActive,
      targetDays: sortUniqueDayIndices(e.targetDays),
    }))
    cleaned.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    if (cleaned.length > 0) out[h.name] = cleaned
  })
  return out
}

/**
 * Ensure every habit has at least one history segment (migration + forward-compat).
 * @param {unknown} raw
 * @param {string[]} activeHabits
 * @param {Record<string, number[]>} targetDays
 * @returns {HabitConfigHistory}
 */
export function ensureHabitConfigHistoryShape(raw, activeHabits, targetDays) {
  const parsed = parseHabitConfigHistory(raw)
  const activeSet = new Set(activeHabits ?? [])
  /** @type {HabitConfigHistory} */
  const out = { ...parsed }

  habits.forEach((h) => {
    if (out[h.name] && out[h.name].length > 0) return
    out[h.name] = [
      {
        effectiveFrom: HABIT_CONFIG_HISTORY_EPOCH,
        isActive: activeSet.has(h.name),
        targetDays: normalizedTargetsForHabit(h.name, targetDays, activeSet),
      },
    ]
  })
  return out
}

function entriesEqual(a, b) {
  if (a.isActive !== b.isActive) return false
  const da = a.targetDays ?? []
  const db = b.targetDays ?? []
  if (da.length !== db.length) return false
  for (let i = 0; i < da.length; i += 1) {
    if (da[i] !== db[i]) return false
  }
  return true
}

/**
 * Append or replace a segment when active/target changes.
 * - Same calendar day: replace that day's entry (latest wins).
 * - Identical config to the previous segment: no-op (avoids duplicate segments).
 */
export function recordHabitConfigChange(history, habitName, today, { isActive, targetDays }) {
  const base = history && typeof history === 'object' ? { ...history } : {}
  const normDays = sortUniqueDayIndices(targetDays)
  const prevList = [...(base[habitName] ?? [])].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  const nextEntry = { effectiveFrom: today, isActive, targetDays: normDays }

  const last = prevList[prevList.length - 1]
  if (last && last.effectiveFrom === today) {
    if (entriesEqual(last, nextEntry)) return base
    prevList[prevList.length - 1] = nextEntry
    base[habitName] = prevList
    return base
  }

  if (last && entriesEqual(last, nextEntry)) {
    return base
  }

  prevList.push(nextEntry)
  base[habitName] = prevList
  return base
}

/**
 * Rank engine: latest segment with effectiveFrom <= dateStr.
 * For weekly scoring, pass a calendar day in that week (e.g. Sunday) so segments that
 * start mid-week still apply to that week. Passing only Monday wrongly drops those segments.
 * Falls back to current targetDays + isActive when history missing for that habit.
 */
export function resolveHabitConfigAtDate(
  habitName,
  dateStr,
  habitConfigHistory,
  _habit,
  fallbackTargetDays,
  fallbackIsActive
) {
  const list = habitConfigHistory?.[habitName]
  if (!Array.isArray(list) || list.length === 0) {
    const td = Array.isArray(fallbackTargetDays) ? sortUniqueDayIndices(fallbackTargetDays) : []
    return { isActive: !!fallbackIsActive, targetDays: td }
  }

  const sorted = [...list].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  let chosen = null
  for (let i = 0; i < sorted.length; i += 1) {
    const e = sorted[i]
    if (e.effectiveFrom <= dateStr) chosen = e
    else break
  }

  if (!chosen) {
    const td = Array.isArray(fallbackTargetDays) ? sortUniqueDayIndices(fallbackTargetDays) : []
    return { isActive: !!fallbackIsActive, targetDays: td }
  }

  return {
    isActive: !!chosen.isActive,
    targetDays: sortUniqueDayIndices(chosen.targetDays),
  }
}

/**
 * Weekly target count from selected weekdays (same rule as rankEngineV4).
 */
export function weeklyTargetFromSelectedDays(targetDaysArr, habit) {
  const selectedCount = Array.isArray(targetDaysArr) ? targetDaysArr.length : 0
  if (selectedCount > 0) return selectedCount
  return Number(habit.defaultWeeklyTarget) || 0
}
