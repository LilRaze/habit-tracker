/**
 * Sanity check: `deriveRanksV4` uses current activeHabits + targetDays + completions only.
 * (Historical habit config was removed from the rank engine.)
 * Run: npx vite-node scripts/rank-history-vs-legacy.mjs
 */
import { deriveRanksV4 } from '../src/utils/rankEngineV4.js'
import { addDaysToDateStr, getWeekStartKey } from '../src/utils/progress.js'

const monday = getWeekStartKey()

const sample = deriveRanksV4(
  { Gym: [monday, addDaysToDateStr(monday, 1)] },
  { Gym: [0, 1, 2] },
  ['Gym'],
  undefined
)

console.log(JSON.stringify(sample, null, 2))
