/**
 * Dev/analysis-only: compare production Stats vs Rank on synthetic histories.
 * Usage:
 *   node scripts/statsRankSimulation.mjs           # validation batch (20×40×6)
 *   node scripts/statsRankSimulation.mjs --full  # full batch (50×100×6)
 */
import './statsRankSimulation/installEnv.mjs'
import { runAndWrite } from './statsRankSimulation/run.mjs'

const mode = process.argv.includes('--full') ? 'full' : 'validation'
const smoke = process.argv.includes('--smoke')

// eslint-disable-next-line no-console
console.log(
  `[statsRankSimulation] mode=${mode} smoke=${smoke} (flags: --full, --smoke)`
)

const out = runAndWrite({ mode, smoke })

// eslint-disable-next-line no-console
console.log('[statsRankSimulation] wrote:', out.paths)
