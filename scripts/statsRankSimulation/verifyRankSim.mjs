/**
 * Spot-check: deriveRanksV4Sim must match deriveRanksV4 for random synthetic histories.
 * Run: node scripts/statsRankSimulation.bundle.mjs  (after esbuild includes this) OR:
 *   npx esbuild scripts/statsRankSimulation/verifyRankSim.mjs --bundle --platform=node --format=esm --outfile=scripts/verifyRankSim.bundle.mjs && node scripts/verifyRankSim.bundle.mjs
 */
import './installEnv.mjs'
import { deriveLongTermStats } from '../../src/utils/stats.js'
import { deriveRanksV4 } from '../../src/utils/rankEngineV4.js'
import { deriveRanksV4Sim } from './lib/rankSimFast.mjs'
import { deriveLongTermStatsWithPerHabitRaw } from './lib/metrics.mjs'
import { generateCompletions } from './lib/generate.mjs'
import { ARCHETYPES } from './lib/archetypes.mjs'
import { HABIT_PROFILES } from './lib/profiles.mjs'

let failed = false
for (let i = 0; i < 40; i += 1) {
  for (const w of [4, 12, 24, 96]) {
    const seed = ((i + 1) * 999 + w * 17) >>> 0
    const archetype = ARCHETYPES[i % ARCHETYPES.length]
    const profile = HABIT_PROFILES[i % HABIT_PROFILES.length]
    const { completions, targetDays, activeHabits } = generateCompletions({
      archetype,
      profile,
      totalWeeks: w,
      seed,
    })
    const a = deriveRanksV4(completions, targetDays, activeHabits, undefined)
    const b = deriveRanksV4Sim(completions, targetDays, activeHabits, undefined)
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      // eslint-disable-next-line no-console
      console.error('Rank mismatch', { i, w, seed, archetype: archetype.id, profile: profile.id })
      failed = true
    }
    const s0 = deriveLongTermStats(completions, targetDays, activeHabits)
    const s1 = deriveLongTermStatsWithPerHabitRaw(completions, targetDays, activeHabits).derived
    if (JSON.stringify(s0) !== JSON.stringify(s1)) {
      // eslint-disable-next-line no-console
      console.error('Stats mismatch', { i, w, seed, archetype: archetype.id, profile: profile.id })
      failed = true
    }
  }
}

if (failed) process.exit(1)
// eslint-disable-next-line no-console
console.log(
  '[verifyRankSim] OK: deriveRanksV4Sim + deriveLongTermStatsWithPerHabitRaw match production on spot checks'
)
