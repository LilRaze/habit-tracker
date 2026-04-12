/**
 * Helpers for weekly target selection (Targets screen) and rank denominator.
 * Historical config segments were removed from rank; rank uses current `targetDays` only.
 */

export function defaultTargetDayIndicesForHabit(habit) {
  const n = Number(habit.defaultWeeklyTarget) || 0
  return Array.from({ length: Math.max(0, n) }, (_, i) => i)
}

export function sortUniqueDayIndices(days) {
  if (!Array.isArray(days)) return []
  const valid = days.filter((d) => typeof d === 'number' && d >= 0 && d <= 6 && Number.isInteger(d))
  return [...new Set(valid)].sort((a, b) => a - b)
}

/**
 * Weekly target count from selected weekdays (same rule as rankEngineV4).
 */
export function weeklyTargetFromSelectedDays(targetDaysArr, habit) {
  const selectedCount = Array.isArray(targetDaysArr) ? targetDaysArr.length : 0
  if (selectedCount > 0) return selectedCount
  return Number(habit.defaultWeeklyTarget) || 0
}
