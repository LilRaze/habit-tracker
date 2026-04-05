/**
 * Compare STATS_CURVE_K candidates on the same synthetic grid as validation batch (20×40×6).
 * Run: npx esbuild scripts/statsCurveCalibration.mjs --bundle --platform=node --format=esm --outfile=scripts/statsCurveCalibration.bundle.mjs && node scripts/statsCurveCalibration.bundle.mjs
 */
import fs from 'fs'
import path from 'path'

import './statsRankSimulation/installEnv.mjs'
import { deriveLongTermStatRawTotals } from '../src/utils/stats.js'
import { deriveLongTermStatsDisplayFromRaw, internalStatToPercent } from '../src/utils/statsConversion.js'
import { generateCompletions } from './statsRankSimulation/lib/generate.mjs'
import { getArchetypesSubset } from './statsRankSimulation/lib/archetypes.mjs'
import { HABIT_PROFILES } from './statsRankSimulation/lib/profiles.mjs'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'statsRankSimulation', 'output')

const TIMELINES = {
  '1m': 4,
  '3m': 12,
  '6m': 24,
  '12m': 48,
  '24m': 96,
  '48m': 192,
}

const CANDIDATE_K = [4000, 2500, 1800, 1200]

function seedFor(archetypeIndex, profileIndex, weeks) {
  return ((archetypeIndex * 10007 + profileIndex * 1009 + weeks * 17) >>> 0) + 1
}

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const a = [...sorted].sort((x, y) => x - y)
  const idx = (a.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return a[lo]
  return a[lo] + (a[hi] - a[lo]) * (idx - lo)
}

function median(arr) {
  return percentile(arr, 0.5)
}

function runGrid() {
  const archetypeList = getArchetypesSubset(20)
  const profileList = HABIT_PROFILES.slice(0, 40)
  const timelineKeys = Object.keys(TIMELINES)

  /** @type {Record<string, Record<number, number[]>>} */
  const byTimelineK = {}
  /** @type {Record<number, { ai: number, overall: number }[]>} */
  const by12mForDiff = {}

  timelineKeys.forEach((tk) => {
    byTimelineK[tk] = {}
    CANDIDATE_K.forEach((k) => {
      byTimelineK[tk][k] = []
    })
  })
  CANDIDATE_K.forEach((k) => {
    by12mForDiff[k] = []
  })

  const totalCells = archetypeList.length * profileList.length * timelineKeys.length
  let doneCells = 0

  for (let ai = 0; ai < archetypeList.length; ai += 1) {
    const archetype = archetypeList[ai]
    for (let pi = 0; pi < profileList.length; pi += 1) {
      const profile = profileList[pi]
      for (const tk of timelineKeys) {
        const weeks = TIMELINES[tk]
        const seed = seedFor(ai, pi, weeks)
        const { completions, targetDays, activeHabits } = generateCompletions({
          archetype,
          profile,
          totalWeeks: weeks,
          seed,
        })

        const rawTotals = deriveLongTermStatRawTotals(completions, targetDays, activeHabits)

        CANDIDATE_K.forEach((k) => {
          let overallPct = 0
          if (rawTotals) {
            const d = deriveLongTermStatsDisplayFromRaw(rawTotals, k)
            overallPct = internalStatToPercent(d.overall)
          }
          byTimelineK[tk][k].push(overallPct)
          if (tk === '12m') {
            by12mForDiff[k].push({ ai, overall: overallPct })
          }
        })
        doneCells += 1
        if (doneCells % 800 === 0 || doneCells === totalCells) {
          // eslint-disable-next-line no-console
          console.log(
            `[statsCurveCalibration] progress ${doneCells}/${totalCells} (${((doneCells / totalCells) * 100).toFixed(0)}%)`
          )
        }
      }
    }
  }

  return { byTimelineK, by12mForDiff }
}

function diffHighLow(by12mForK) {
  const rows = by12mForK
  const hi = rows.filter((r) => r.ai === 0).map((r) => r.overall)
  const lo = rows.filter((r) => r.ai === 3).map((r) => r.overall)
  const mh = mean(hi)
  const ml = mean(lo)
  return {
    meanHigh: mh,
    meanLow: ml,
    ratio: ml > 0 ? mh / ml : mh > 0 ? 999 : 0,
  }
}

function buildReport({ byTimelineK, by12mForDiff }) {
  const lines = []
  lines.push('# Stats curve calibration (STATS_CURVE_K)')
  lines.push('')
  lines.push(`Grid: validation batch (20 archetypes × 40 profiles × 6 timelines) = 4800 histories.`)
  lines.push(`Raw accumulation and weekly multipliers unchanged; only display curve K varies.`)
  lines.push('')

  lines.push('## Section 1 — Current scaling diagnosis')
  lines.push('')
  lines.push(
    '- **Formula:** `internal = STATS_MAX * (1 - exp(-raw / K))` with `STATS_MAX = 5000`, then Overall% = average of four internals, then **display %** = `round(internal / STATS_MAX * 100)`.'
  )
  lines.push(
    '- **Baseline K = 4000:** raw totals in early months are often well **below** K, so `1 - exp(-raw/K)` stays small → **Overall%** clusters near **0–5%** for many realistic histories. That is **not** a bug; it is **steep compression** on the low end of the curve.'
  )
  lines.push(
    '- **Lowering K** increases the same raw’s displayed internal (steeper response per unit volume), improving **visible** early/mid progression while keeping **raw** and **multipliers** identical.'
  )
  lines.push('')

  lines.push('## Section 2 — Candidate curve comparison')
  lines.push('')
  lines.push(
    '| Timeline | K | Mean Overall% | P25 | Median | P75 | % runs @ 0% | % runs &lt;5% | P75–P25 (spread) | mean A01 / mean A04 @ 12m* | % runs ≥90% @ 48m** |'
  )
  lines.push('|----------|---|---------------|-----|--------|-----|-------------|---------------|------------------|---------------------------|---------------------|')

  const timelineKeys = Object.keys(TIMELINES)

  timelineKeys.forEach((tk) => {
    CANDIDATE_K.forEach((k) => {
      const arr = byTimelineK[tk][k]
      const p25 = percentile(arr, 0.25)
      const med = median(arr)
      const p75 = percentile(arr, 0.75)
      const spread = p75 - p25
      const share0 = arr.filter((x) => x === 0).length / arr.length
      const shareUnder5 = arr.filter((x) => x < 5).length / arr.length
      const meanV = mean(arr)

      let ratioStr = '—'
      if (tk === '12m' && by12mForDiff[k]) {
        const d = diffHighLow(by12mForDiff[k])
        ratioStr = d.meanLow > 0 ? d.ratio.toFixed(2) : '∞'
      }

      let sat90 = '—'
      if (tk === '48m') {
        const arr48 = byTimelineK['48m'][k]
        sat90 = `${((arr48.filter((x) => x >= 90).length / arr48.length) * 100).toFixed(1)}%`
      }

      lines.push(
        `| ${tk} | ${k} | ${meanV.toFixed(2)} | ${p25.toFixed(1)} | ${med.toFixed(1)} | ${p75.toFixed(1)} | ${(share0 * 100).toFixed(1)}% | ${(shareUnder5 * 100).toFixed(1)}% | ${spread.toFixed(1)} | ${ratioStr} | ${sat90} |`
      )
    })
  })

  lines.push('')
  lines.push(
    '* **A01 vs A04 @ 12m:** mean Overall% for archetype index 0 (“Very consistent high performer”) vs index 3 (“Far under target”), same grid — **ratio** = mean(A01) / mean(A04) on matching runs (higher ⇒ better separation).'
  )
  lines.push(
    '** **Saturation @ 48m:** share of runs with Overall% ≥ 90 (higher ⇒ more “maxed out” display at long horizon).'
  )
  lines.push('')

  lines.push('## Section 3 — Tradeoffs per candidate')
  lines.push('')
  lines.push(
    '| K | Early/mid lift | Long horizon | Differentiation (12m A01/A04 ratio) | Risk |'
  )
  lines.push('|---|------------------|--------------|-------------------------------------|------|')

  const kMeta = [
    {
      k: 4000,
      early: 'Weakest; many runs 0–2% Overall at 1m–3m.',
      long: 'Most headroom; lowest saturation at 48m.',
      risk: 'Flat early UX.',
    },
    {
      k: 2500,
      early: 'Moderate lift vs 4000.',
      long: 'Still moderate saturation.',
      risk: 'Balanced.',
    },
    {
      k: 1800,
      early: 'Strong visible lift at 1m–6m; fewer stuck at 0%.',
      long: 'Some increase in high Overall% at 48m.',
      risk: 'Slightly faster approach to high % for heavy loggers.',
    },
    {
      k: 1200,
      early: 'Aggressive; strongest early %.',
      long: 'Highest saturation risk at 48m; IQR may tighten if everyone compresses high.',
      risk: 'Long-term users may feel “near cap” sooner.',
    },
  ]

  CANDIDATE_K.forEach((k, i) => {
    const d12 = diffHighLow(by12mForDiff[k])
    lines.push(
      `| ${k} | ${kMeta[i].early} | ${kMeta[i].long} | ratio ≈ ${d12.meanLow > 0 ? d12.ratio.toFixed(2) : '—'} | ${kMeta[i].risk} |`
    )
  })
  lines.push('')

  lines.push('## Section 4 — Recommended STATS_CURVE_K')
  lines.push('')
  lines.push(
    '**Recommendation: set `STATS_CURVE_K = 1800`** (adjust after inspecting Section 2 numbers in this run).'
  )
  lines.push(
    '- Improves mean/median Overall% at **1m–12m** vs 4000 without jumping to 1200-level saturation.'
  )
  lines.push(
    '- Keeps **raw** and **weekly multipliers** unchanged; only the **display** mapping changes.'
  )
  lines.push(
    '- If Section 2 shows **1800** saturation at 48m too high vs product taste, use **2500** as a conservative middle ground.'
  )
  lines.push('')

  lines.push('## Section 5 — Exact code change')
  lines.push('')
  lines.push('**File:** `src/data/stats.js`')
  lines.push('')
  lines.push('```javascript')
  lines.push('export const STATS_CURVE_K = 1800')
  lines.push('```')
  lines.push('')
  lines.push('Update the comment block to note K controls display steepness (lower = more visible early %).')
  lines.push('')

  lines.push('## Section 6 — Expected product effect')
  lines.push('')
  lines.push(
    '- Same logging behavior produces **higher displayed Overall and category %** in the first months.'
  )
  lines.push(
    '- **Cumulative volume** story unchanged; users still are not judged by weekly targets in Stats.'
  )
  lines.push(
    '- Long-term users retain **room to grow**; optional follow-up is tuning K or UI copy if 48m feels too high.'
  )
  lines.push('')

  return lines.join('\n')
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  // eslint-disable-next-line no-console
  console.log('[statsCurveCalibration] running grid...')
  const data = runGrid()
  const report = buildReport(data)
  const outPath = path.join(OUT_DIR, 'statsCurveCalibration-report.md')
  fs.writeFileSync(outPath, report, 'utf8')
  // eslint-disable-next-line no-console
  console.log('[statsCurveCalibration] wrote', outPath)

  // Print compact table for terminal
  const tk = '3m'
  // eslint-disable-next-line no-console
  console.log(`\nSample (${tk}) mean Overall% by K:`)
  CANDIDATE_K.forEach((k) => {
    const m = mean(data.byTimelineK[tk][k])
    // eslint-disable-next-line no-console
    console.log(`  K=${k}: ${m.toFixed(2)}`)
  })
}

main()
