import { habits } from '../data/habits'
import { getCountForWeekStart, getWeekStartKey, addDaysToDateStr } from './progress'
import { RANK_LADDER, getLpChange, applyLpAndRanks } from '../data/ranks'

/**
 * Derives rank and LP for each habit from completion history.
 * Evaluates all weeks from first completion to current week in chronological order.
 * Source of truth: completions. No stored rank data.
 * Weekly target: number of selected target days, or habit.defaultWeeklyTarget if none selected.
 * Streak bonus: +1 LP on second and later consecutive successful weeks.
 */
export function deriveRanksFromCompletions(completions, targetDays, activeHabits) {
  const result = {}
  const currentWeekStart = getWeekStartKey()
  const activeSet = new Set(activeHabits ?? [])
  const habitsToEvaluate = habits.filter((habit) => activeSet.has(habit.name))

  habitsToEvaluate.forEach((habit) => {
    const dates = completions?.[habit.name] ?? []
    let rank = RANK_LADDER[0]
    let lp = 0
    let successStreak = 0

    if (dates.length === 0) {
      result[habit.name] = { rank, lp }
      return
    }

    const firstDate = dates.reduce((a, b) => (a < b ? a : b))
    let weekStart = getWeekStartKey(new Date(firstDate + 'T12:00:00'))

    while (weekStart <= currentWeekStart) {
      const completed = getCountForWeekStart(dates, weekStart)
      const selectedCount = targetDays?.[habit.name]?.length
      const target = selectedCount != null && selectedCount > 0
        ? selectedCount
        : habit.defaultWeeklyTarget
      const baseLpChange = getLpChange(completed, target)
      const isSuccessfulWeek = completed >= target
      const streakBonus = isSuccessfulWeek && successStreak >= 1 ? 1 : 0
      const lpChange = baseLpChange + streakBonus
      const next = applyLpAndRanks(rank, lp, lpChange)
      rank = next.rank
      lp = next.lp
      successStreak = isSuccessfulWeek ? successStreak + 1 : 0
      weekStart = addDaysToDateStr(weekStart, 7)
    }

    result[habit.name] = { rank, lp }
  })

  return result
}
