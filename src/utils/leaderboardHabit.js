import { deriveRanksV4 } from './rankEngineV4'
import { buildRankDisplayView } from './rankDisplayPresentation'

/**
 * @param {{ rankSnapshot: { completions: object, targetDays: object, activeHabits: string[] } | null } | null} entry
 * @param {{ id: string, name: string }} habit
 * @param {'lol'|'valorant'} rankVisualTheme
 */
export function computeLeaderboardHabitRow(entry, habit, rankVisualTheme) {
  const unrankedView = () =>
    buildRankDisplayView('Unranked', 0, {
      theme: rankVisualTheme,
      context: 'habit',
      testRankOptions: {},
    })

  if (!entry?.rankSnapshot) {
    return {
      habitRanked: false,
      habitProgressSort: -1,
      habitView: unrankedView(),
    }
  }

  const { completions, targetDays, activeHabits } = entry.rankSnapshot
  const activeSet = new Set(activeHabits ?? [])
  const tracksHabit = activeSet.has(habit.name) || activeSet.has(habit.id)
  if (!tracksHabit) {
    return {
      habitRanked: false,
      habitProgressSort: -1,
      habitView: unrankedView(),
    }
  }

  const rankData = deriveRanksV4(completions, targetDays, activeHabits)
  const mock = rankData.habits.find((h) => h.habitName === habit.name || h.habitId === habit.id)
  if (!mock) {
    return {
      habitRanked: false,
      habitProgressSort: -1,
      habitView: unrankedView(),
    }
  }

  const habitView = buildRankDisplayView(mock.rank, mock.lp, {
    theme: rankVisualTheme,
    context: 'habit',
    testRankOptions: {},
  })

  return {
    habitRanked: true,
    habitProgressSort: mock.progressValue ?? 0,
    habitView,
  }
}
