import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getStatKeysForHabit } from '../../src/data/habitStatMapping.js'
import { generateCompletions, countTotalCompletions, countCompletionsInCurrentWeek } from './lib/generate.mjs'
import { ARCHETYPES, getArchetypesSubset } from './lib/archetypes.mjs'
import { HABIT_PROFILES } from './lib/profiles.mjs'
import {
  deriveLongTermStatsWithPerHabitRaw,
  computeAverageAdherenceRatio,
  statsToPercentDisplay,
} from './lib/metrics.mjs'
import { deriveRanksV4Sim } from './lib/rankSimFast.mjs'
import { SIMULATION_END_DATE_STR } from './installEnv.mjs'

// When run via esbuild bundle, import.meta.url is scripts/*.bundle.mjs — use cwd-relative path.
const OUT_DIR = path.join(process.cwd(), 'scripts', 'statsRankSimulation', 'output')

export const TIMELINES = {
  '1m': 4,
  '3m': 12,
  '6m': 24,
  '12m': 48,
  '24m': 96,
  '48m': 192,
}

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function seedFor(archetypeIndex, profileIndex, weeks) {
  return ((archetypeIndex * 10007 + profileIndex * 1009 + weeks * 17) >>> 0) + 1
}

function mappedCounts(activeHabits) {
  let mapped = 0
  let unmapped = 0
  ;(activeHabits ?? []).forEach((name) => {
    if (getStatKeysForHabit(name).length > 0) mapped += 1
    else unmapped += 1
  })
  return { mappedHabitCount: mapped, unmappedHabitCount: unmapped }
}

function perHabitCompletionCounts(completions, activeHabits) {
  const o = {}
  ;(activeHabits ?? []).forEach((name) => {
    o[name] = (completions?.[name] ?? []).length
  })
  return o
}

function buildDivergenceNotes({
  statPctOverall,
  avgAdherence,
  totalCompletions,
  currentWeekCompletions,
  rankOverall,
  mappedHabitCount,
}) {
  const notes = []
  const share = totalCompletions > 0 ? currentWeekCompletions / totalCompletions : 0

  if (share > 0.45 && totalCompletions > 8) {
    notes.push(
      'Current-week-heavy logging: most completions land this week; Stats and Rank both include this week, but Stats still scale raw volume differently than Rank’s target-ratio LP.'
    )
  }
  if (avgAdherence != null && statPctOverall - avgAdherence * 100 > 18) {
    notes.push(
      'Stats Overall much higher than mean weekly adherence: Stats weight raw completion volume × early-week multipliers, not target ratio.'
    )
  }
  if (avgAdherence != null && avgAdherence * 100 - statPctOverall > 18) {
    notes.push(
      'Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.'
    )
  }
  if (mappedHabitCount === 0 && totalCompletions > 0) {
    notes.push('No stat-mapped active habits: Stats stay at 0; Rank still moves from completions vs targets.')
  }
  if (rankOverall?.rank === 'Unranked' && statPctOverall > 15) {
    notes.push('Unranked overall Rank but visible Stats: short history or only current week / no full rank weeks evaluated.')
  }
  return notes
}

function divergenceScore(row) {
  const a = row.avgAdherenceClamped ?? 0
  const s = row.statOverallPct / 100
  const share = row.currentWeekShare ?? 0
  const rp = row.rankOverallProgressValue ?? 0
  return (
    Math.abs(s - a) * 100 +
    share * 35 +
    Math.min(40, Math.abs(s * 100 - Math.min(100, rp / 25)))
  )
}

function summarizeTargetProfile(targetDays) {
  const keys = Object.keys(targetDays ?? {})
  if (keys.length === 0) return 'none'
  return keys
    .map((k) => `${k}:${(targetDays[k] ?? []).length}d`)
    .slice(0, 6)
    .join('; ')
}

export function runSimulationBatch({ mode = 'validation', smoke = false }) {
  let archetypeList = mode === 'full' ? ARCHETYPES : getArchetypesSubset(20)
  let profileList = mode === 'full' ? HABIT_PROFILES : HABIT_PROFILES.slice(0, 40)
  let timelineKeys = Object.keys(TIMELINES)

  if (smoke) {
    archetypeList = [ARCHETYPES[0]]
    profileList = [HABIT_PROFILES[0]]
    timelineKeys = ['1m']
  }

  const rows = []

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

        const { derived, perHabit: perHabitRaw } = deriveLongTermStatsWithPerHabitRaw(
          completions,
          targetDays,
          activeHabits
        )
        const rankData = deriveRanksV4Sim(completions, targetDays, activeHabits, undefined)
        const pct = statsToPercentDisplay(derived)
        const perHabitRawStatSummary = {}
        Object.entries(perHabitRaw).forEach(([name, b]) => {
          perHabitRawStatSummary[name] =
            b.strength + b.health + b.intelligence + b.discipline
        })
        const avgAdherence = computeAverageAdherenceRatio(completions, targetDays, activeHabits)
        const totalCompletions = countTotalCompletions(completions)
        const currentWeekCompletions = countCompletionsInCurrentWeek(completions, activeHabits)
        const { mappedHabitCount, unmappedHabitCount } = mappedCounts(activeHabits)

        const notes = buildDivergenceNotes({
          statPctOverall: pct.overall,
          avgAdherence,
          totalCompletions,
          currentWeekCompletions,
          rankOverall: rankData.overall,
          mappedHabitCount,
        })

        const row = {
          simulationId: `${archetype.id}_${profile.id}_${tk}`,
          archetypeId: archetype.id,
          archetypeName: archetype.name,
          profileId: profile.id,
          profileLabel: profile.label,
          timelineKey: tk,
          weeks,
          activeHabitCount: activeHabits.length,
          habitList: activeHabits,
          mappedHabitCount,
          unmappedHabitCount,
          targetProfileSummary: summarizeTargetProfile(targetDays),
          behaviorDescription: `${archetype.name} × ${profile.label}`,
          totalCompletionCount: totalCompletions,
          completionsPerActiveHabit: perHabitCompletionCounts(completions, activeHabits),
          statOverallPct: pct.overall,
          statHealthPct: pct.health,
          statStrengthPct: pct.strength,
          statIntelligencePct: pct.intelligence,
          statDisciplinePct: pct.discipline,
          perHabitRawStatTotalByHabit: perHabitRawStatSummary,
          avgAdherenceClamped: avgAdherence,
          rankOverallRank: rankData.overall.rank,
          rankOverallLp: rankData.overall.lp,
          rankOverallProgressValue: rankData.overall.progressValue,
          perHabitRanks: rankData.habits.map((h) => ({
            habitName: h.habitName,
            rank: h.rank,
            lp: h.lp,
            progressValue: h.progressValue,
            weeksEvaluated: h.weeksEvaluated,
          })),
          currentWeekCompletions,
          currentWeekShare: totalCompletions > 0 ? currentWeekCompletions / totalCompletions : 0,
          divergenceNotes: notes,
          virtualToday: SIMULATION_END_DATE_STR,
        }
        row.divergenceScore = divergenceScore(row)
        rows.push(row)
      }
    }
  }

  return {
    rows,
    mode,
    smoke,
    archetypeCount: archetypeList.length,
    profileCount: profileList.length,
  }
}

function aggregateByTimeline(rows) {
  const byT = {}
  Object.keys(TIMELINES).forEach((tk) => {
    const subset = rows.filter((r) => r.timelineKey === tk)
    const overall = subset.map((r) => r.statOverallPct)
    const adh = subset.map((r) => r.avgAdherenceClamped).filter((x) => x != null)
    byT[tk] = {
      count: subset.length,
      statOverall: mean(overall),
      statOverallP25: percentile(overall, 0.25),
      statOverallP75: percentile(overall, 0.75),
      avgAdherenceMean: adh.length ? mean(adh) : null,
    }
  })
  return byT
}

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function percentile(sortedOrArr, p) {
  const arr = [...sortedOrArr].sort((a, b) => a - b)
  if (!arr.length) return 0
  const idx = Math.min(arr.length - 1, Math.floor(p * (arr.length - 1)))
  return arr[idx]
}

function buildMarkdownReport({ rows, mode }) {
  const byTimeline = aggregateByTimeline(rows)
  const sortedDiv = [...rows].sort((a, b) => b.divergenceScore - a.divergenceScore)
  const top15 = sortedDiv.slice(0, 15)
  const top10Stories = sortedDiv.slice(0, 10)

  const lines = []

  lines.push('# Stats vs Rank simulation report')
  lines.push('')
  lines.push(`- **Batch**: ${mode}`)
  lines.push(`- **Rows**: ${rows.length}`)
  lines.push(`- **Virtual “today”**: ${SIMULATION_END_DATE_STR} (see installEnv.mjs)`)
  lines.push('')

  lines.push('## Executive summary')
  lines.push('')
  lines.push(
    'This study compares **production** `deriveLongTermStats` (Stats) and `deriveRanksV4` (Rank) on synthetic completion histories. Stats sum **raw completion counts** with **early-week multipliers** and a global **exp curve**; Rank sums **matrix-calibrated weekly LP** from **clamped adherence ratios** per Mon–Sun week **including the current week** (partial progress counts). The same completions therefore often produce **different stories**: high volume with modest ratios inflates Stats relative to Rank; mapping and curve shape still diverge from target-based LP.'
  )
  lines.push('')

  lines.push('## Section 1 — Methodology')
  lines.push('')
  lines.push('- **Production functions reused**')
  lines.push('  - Stats: `rawStatToDisplay` from `src/utils/statsConversion.js`; numerically identical totals to `deriveLongTermStats` (simulation uses `deriveLongTermStatsWithPerHabitRaw` in `lib/metrics.mjs` — one pass with per-week **bucket maps** instead of repeated `getCountForWeekStart` scans; spot-checked vs production in `verifyRankSim.mjs`).')
  lines.push('  - Rank: `interpolateWeeklyGain` + `progressToRank` from `src/utils/rankEngineV4.js` (now exported); batch uses `deriveRanksV4Sim` in `lib/rankSimFast.mjs` — same math as `deriveRanksV4` with **bucketed** weekly counts; spot-checked vs production in `verifyRankSim.mjs`.')
  lines.push('  - Week utilities: `getWeekStartKey`, `addDaysToDateStr` from `src/utils/progress.js`')
  lines.push('- **Synthetic completions**: generated in `scripts/statsRankSimulation/lib/generate.mjs` as `YYYY-MM-DD` strings per Mon–Sun week, deterministic `mulberry32` seed per (archetype, profile, timeline).')
  lines.push('- **Virtual clock**: `scripts/statsRankSimulation/installEnv.mjs` patches `globalThis.Date` and `localStorage` **before** importing Stats/Rank so `getNow()` matches a fixed “today” for reproducible week boundaries.')
  lines.push('- **Week boundaries**: aligned with production Monday-start weeks.')
  lines.push('- **Stats vs Rank week coverage**: Both Stats and Rank include the **current** Mon–Sun week (partial-week completions contribute to Rank ratio and weekly LP).')
  lines.push('- **Per-habit raw stat totals**: `deriveLongTermStatsWithPerHabitRaw` in `lib/metrics.mjs` (analysis-only; same arithmetic as production Stats).')
  lines.push('')

  lines.push('## Section 2 — Results by timeline (aggregates)')
  lines.push('')
  lines.push('| Timeline | Runs | Mean Overall Stat % | P25 | P75 | Mean avg adherence* |')
  lines.push('|----------|------|---------------------|-----|-----|---------------------|')
  Object.keys(TIMELINES).forEach((tk) => {
    const a = byTimeline[tk]
    lines.push(
      `| ${tk} | ${a.count} | ${a.statOverall.toFixed(1)} | ${a.statOverallP25} | ${a.statOverallP75} | ${a.avgAdherenceMean == null ? 'n/a' : (a.avgAdherenceMean * 100).toFixed(1) + '%'} |`
    )
  })
  lines.push('')
  lines.push('*Mean of per-run **clamped** adherence (completed ÷ weeklyTarget, capped at 1) over all habit×rank-week cells.*')
  lines.push('')

  lines.push('### Representative examples (one per timeline, highest divergence score)')
  lines.push('')
  Object.keys(TIMELINES).forEach((tk) => {
    const pick = [...rows].filter((r) => r.timelineKey === tk).sort((a, b) => b.divergenceScore - a.divergenceScore)[0]
    if (!pick) return
    lines.push(`#### ${tk}`)
    lines.push(`- **${pick.simulationId}**: ${pick.archetypeName} / ${pick.profileLabel}`)
    lines.push(`- Overall Stat **${pick.statOverallPct}%**, avg adherence **${pick.avgAdherenceClamped == null ? 'n/a' : (pick.avgAdherenceClamped * 100).toFixed(1)}%**, Rank **${pick.rankOverallRank}** ${pick.rankOverallLp} LP (pv ${pick.rankOverallProgressValue}), current-week share **${(pick.currentWeekShare * 100).toFixed(1)}%**`)
    lines.push('')
  })

  lines.push('## Section 3 — Behavioral findings (patterns)')
  lines.push('')
  lines.push('- **High Stats + mediocre Rank**: many completion **days** with **low ratio vs target** (especially high default targets) — Stats ignore targets; Rank penalizes low ratios.')
  lines.push('- **High Rank + slower Stats**: strong **clamped adherence** on **few** weeks but **low raw volume** or **few mapped** habits — Rank grows on ratio×week LP; Stats need mapped completions × multipliers.')
  lines.push('- **Similar Stats, different behaviors**: same exp-curve saturation from different raw paths (e.g. many weak weeks vs few strong weeks).')
  lines.push('- **Similar Rank, different category profiles**: Rank is **not** category-based; similar `progressValue` can come from different habit sets.')
  lines.push('- **Mapped vs unmapped**: unmapped habits can drive **Rank** but contribute **zero** to Stats.')
  lines.push('- **Current-week-heavy**: spikes **Stats**; **Rank** still gains LP from this week’s ratio, but prior empty weeks limit cumulative rank.')
  lines.push('- **Front-loaded users**: early Stats **multipliers** inflate cumulative raw totals vs later periods.')
  lines.push('')

  lines.push('## Section 4 — Stat scaling interpretation')
  lines.push('')
  lines.push('- **Overall / categories**: displayed as **% of STATS_MAX** after `1 - exp(-raw/K)` — **compressed** at high raw totals; interpretation shifts by **timeline** (longer history → easier to sit “high” on Overall if mapped activity persists).')
  lines.push('- **Timeline**: at **1m**, low–mid % is common unless intense mapped logging; at **48m**, many archetypes approach **elite** on the curve if consistently active.')
  lines.push('- **Global vs per-habit**: production Stats are **global** aggregates; per-habit interpretation is indirect (only via **mapping** and **volume**).')
  lines.push('- **Misleading**: high % does not imply good **target adherence**; low % possible with **only unmapped** habits despite strong Rank.')
  lines.push('')

  lines.push('## Section 5 — Per-habit scaling (current implementation)')
  lines.push('')
  lines.push('- **Equal weight** per **completion day** per **mapped** stat key; **double-mapped** habits add the same weeklyCount×multiplier into **two** buckets.')
  lines.push('- **Unmapped** habits: **invisible** to Stats.')
  lines.push('- **No target awareness** in Stats; **quantity** settings not used.')
  lines.push('')

  lines.push('## Section 6 — Anomalies & edge cases (covered by archetypes)')
  lines.push('')
  lines.push('| Case | How it shows up |')
  lines.push('|------|-----------------|')
  lines.push('| Active but unmapped | Rank moves; Stats Overall may stay 0 |')
  lines.push('| Many completions on low-target habits | Rank ratios near 1; Stats depend on mapping spread |')
  lines.push('| Barely miss weekly target | Rank ratio <1; Stats still add partial week volume |')
  lines.push('| Exceed target | Rank caps ratio at 1; Stats still count extra days |')
  lines.push('| Strong recent-only | High current-week share; Rank Unranked or low weeksEvaluated |')
  lines.push('| Strong past / weak recent | Stats cumulative; Rank LP from each week’s ratio including partial current week |')
  lines.push('| Same total completions / different targets | Different Rank ratios; Stats similar if mapping similar |')
  lines.push('')

  lines.push('## Section 7 — Calibration cheat sheet (rule-of-thumb)')
  lines.push('')
  lines.push('| Horizon | Overall % (mapped activity) | Notes |')
  lines.push('|---------|------------------------------|-------|')
  lines.push('| 1m | 0–25 typical light; 25–55 active; 55+ very strong mapped volume | Unstable if <4 weeks of data; unmapped-only → 0 |')
  lines.push('| 3m | +10–20 pts vs 1m typical under continued use | Early multipliers taper |')
  lines.push('| 6m | mid/high common for steady users | Curve compression |')
  lines.push('| 12m | high values need consistent mapped logging | Compare to adherence, not only % |')
  lines.push('| 24m / 48m | asymptotic band; small % moves = large raw history | Interpret vs Rank separately |')
  lines.push('')
  lines.push('**Unstable / misleading**: unmapped-only users; current-week-only spikes; comparing Stats to Rank without adherence context.')
  lines.push('')

  lines.push('## Section 8 — Recommendations (no code changes)')
  lines.push('')
  lines.push('- **Cumulative Stats**: keep if the product goal is “lifetime signal”; expose **windowed** or **adherence-aware** metrics if the goal is “how well am I doing lately”.')
  lines.push('- **Target-aware Stats**: would align interpretation with Rank and user mental models; tradeoff: more coupling to Targets configuration.')
  lines.push('- **Exclude current week from Stats or Rank**: would change how “live” partial weeks feel; Stats and Rank now both include the current week.')
  lines.push('- **Surface unmapped habits**: users may think Stats are “broken” when only unmapped habits are active.')
  lines.push('- **Category clarity**: mapping is opaque; users may not know why Gym feeds two categories.')
  lines.push('')

  lines.push('## Top 15 informative runs (by divergence score)')
  lines.push('')
  lines.push('| # | ID | Timeline | Overall Stat % | Avg adh % | Rank | PV | Curr week % | Notes |')
  lines.push('|---|----|----------|----------------|-----------|------|-----|-------------|-------|')
  top15.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.simulationId} | ${r.timelineKey} | ${r.statOverallPct} | ${r.avgAdherenceClamped == null ? 'n/a' : (r.avgAdherenceClamped * 100).toFixed(1)} | ${r.rankOverallRank} | ${r.rankOverallProgressValue} | ${(r.currentWeekShare * 100).toFixed(0)} | ${r.divergenceNotes[0] ?? ''} |`
    )
  })
  lines.push('')

  lines.push('## Top 10 — Stats vs Rank “different stories”')
  lines.push('')
  top10Stories.forEach((r, i) => {
    lines.push(`${i + 1}. **${r.simulationId}** — Stat ${r.statOverallPct}% vs adherence ${r.avgAdherenceClamped == null ? 'n/a' : (r.avgAdherenceClamped * 100).toFixed(1)}% vs Rank **${r.rankOverallRank}** (${r.rankOverallProgressValue} pv). ${r.divergenceNotes.join(' ')}`)
  })
  lines.push('')

  lines.push('## Compact summary table (sample of high-divergence)')
  lines.push('')
  lines.push('| Archetype | Timeline | Total comps | Avg adh | Overall Stat % | Rank | Main explanation |')
  lines.push('|-----------|----------|-------------|---------|----------------|------|------------------|')
  top15.slice(0, 12).forEach((r) => {
    lines.push(
      `| ${r.archetypeId} | ${r.timelineKey} | ${r.totalCompletionCount} | ${r.avgAdherenceClamped == null ? 'n/a' : (r.avgAdherenceClamped * 100).toFixed(1) + '%'} | ${r.statOverallPct}% | ${r.rankOverallRank} | ${r.divergenceNotes[0] ?? '—'} |`
    )
  })
  lines.push('')

  lines.push('## Top 5 design risks (Stats system)')
  lines.push('')
  lines.push('1. **Target-blind volume reward** can contradict Rank and user intent.')
  lines.push('2. **Stats vs Rank scaling** still diverges even when both include the current week (volume vs ratio×LP).')
  lines.push('3. **Unmapped habits** create “silent” activity in Stats.')
  lines.push('4. **Early-week multipliers** distort cross-user comparison and late joiners.')
  lines.push('5. **Global exp curve** hides per-habit and per-category tradeoffs behind single %s.')
  lines.push('')

  return lines.join('\n')
}

export function writeOutputs(result) {
  ensureOutDir()
  const jsonPath = path.join(OUT_DIR, 'statsRankSimulation-results.json')
  const mdPath = path.join(OUT_DIR, 'statsRankSimulation-report.md')
  const csvPath = path.join(OUT_DIR, 'statsRankSimulation-summary.csv')

  fs.writeFileSync(jsonPath, JSON.stringify(result), 'utf8')

  const md = buildMarkdownReport({ rows: result.rows, mode: result.mode })
  fs.writeFileSync(mdPath, md, 'utf8')

  const header = [
    'simulationId',
    'archetypeId',
    'profileId',
    'timelineKey',
    'weeks',
    'totalCompletionCount',
    'avgAdherenceClamped',
    'statOverallPct',
    'rankOverallRank',
    'rankOverallLp',
    'rankOverallProgressValue',
    'currentWeekShare',
    'mappedHabitCount',
    'unmappedHabitCount',
  ].join(',')

  const csvLines = [header]
  result.rows.forEach((r) => {
    csvLines.push(
      [
        r.simulationId,
        r.archetypeId,
        r.profileId,
        r.timelineKey,
        r.weeks,
        r.totalCompletionCount,
        r.avgAdherenceClamped ?? '',
        r.statOverallPct,
        r.rankOverallRank,
        r.rankOverallLp,
        r.rankOverallProgressValue,
        r.currentWeekShare.toFixed(4),
        r.mappedHabitCount,
        r.unmappedHabitCount,
      ].join(',')
    )
  })
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

  return { jsonPath, mdPath, csvPath }
}

export function runAndWrite(opts) {
  const batch = runSimulationBatch(opts)
  const payload = {
    generatedAt: new Date().toISOString(),
    mode: batch.mode,
    smoke: batch.smoke ?? false,
    archetypeCount: batch.archetypeCount,
    profileCount: batch.profileCount,
    timelines: TIMELINES,
    rowCount: batch.rows.length,
    rows: batch.rows,
  }
  const paths = writeOutputs(payload)
  return { ...payload, paths }
}
