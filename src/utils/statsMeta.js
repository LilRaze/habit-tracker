import { habits } from '../data/habits'
import { getStatKeysForHabit } from '../data/habitStatMapping'

/**
 * Coverage info for the Stats UI: which active habits contribute to Stats vs which are unmapped.
 */
export function getStatsTrackingMeta(activeHabits) {
  const validNames = new Set(habits.map((h) => h.name))
  const actives = [...new Set(activeHabits ?? [])].filter((name) => validNames.has(name))
  const mapped = []
  const unmapped = []
  actives.forEach((name) => {
    if (getStatKeysForHabit(name).length > 0) mapped.push(name)
    else unmapped.push(name)
  })
  return {
    activeCount: actives.length,
    mappedCount: mapped.length,
    unmappedCount: unmapped.length,
    unmappedNames: unmapped,
  }
}
