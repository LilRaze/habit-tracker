# Stats vs Rank simulation report

- **Batch**: validation
- **Rows**: 4800
- **Virtual “today”**: 2030-06-06 (see installEnv.mjs)

## Executive summary

This study compares **production** `deriveLongTermStats` (Stats) and `deriveRanksV4` (Rank) on synthetic completion histories. Stats sum **raw completion counts** with **early-week multipliers** and a global **exp curve**; Rank sums **matrix-calibrated weekly LP** from **clamped adherence ratios** on **full weeks only** (current week excluded). The same completions therefore often produce **different stories**: high volume with modest ratios inflates Stats relative to Rank; current-week-only logging spikes Stats but barely moves Rank.

## Section 1 — Methodology

- **Production functions reused (unchanged)**
  - `deriveLongTermStats` from `src/utils/stats.js`
  - `deriveRanksV4` from `src/utils/rankEngineV4.js`
  - `internalStatToPercent` / `rawStatToDisplay` indirectly via Stats
  - Week utilities: `getWeekStartKey`, `addDaysToDateStr`, `getCountForWeekStart` from `src/utils/progress.js`
- **Synthetic completions**: generated in `scripts/statsRankSimulation/lib/generate.mjs` as `YYYY-MM-DD` strings per Mon–Sun week, deterministic `mulberry32` seed per (archetype, profile, timeline).
- **Virtual clock**: `scripts/statsRankSimulation/installEnv.mjs` patches `globalThis.Date` and `localStorage` **before** importing Stats/Rank so `getNow()` matches a fixed “today” for reproducible week boundaries.
- **Week boundaries**: aligned with production Monday-start weeks.
- **Stats vs Rank week coverage**: Stats include the **current** week through `getWeekStartKey()`; Rank evaluates ratios only through **`lastFullWeekStart`** (production `rankEngineV4`). The report’s **current-week share** flags cases where this gap dominates.
- **Per-habit raw stat buckets**: computed in `lib/metrics.js` by **mirroring** the Stats loop (not exported from production) — same arithmetic as `deriveLongTermStats`, split by habit for analysis only.

## Section 2 — Results by timeline (aggregates)

| Timeline | Runs | Mean Overall Stat % | P25 | P75 | Mean avg adherence* |
|----------|------|---------------------|-----|-----|---------------------|
| 1m | 800 | 1.4 | 0 | 2 | 78.6% |
| 3m | 800 | 3.6 | 1 | 4 | 76.8% |
| 6m | 800 | 5.9 | 1 | 7 | 75.3% |
| 12m | 800 | 9.6 | 2 | 12 | 73.7% |
| 24m | 800 | 14.9 | 4 | 20 | 74.7% |
| 48m | 800 | 22.8 | 7 | 32 | 75.2% |

*Mean of per-run **clamped** adherence (completed ÷ weeklyTarget, capped at 1) over all habit×rank-week cells.*

### Representative examples (one per timeline, highest divergence score)

#### 1m
- **A01_P00_1m**: Very consistent high performer / Single mapped habit
- Overall Stat **0%**, avg adherence **100.0%**, Rank **Iron II** 0 LP (pv 300), current-week share **25.0%**

#### 3m
- **A01_P13_3m**: Very consistent high performer / Single-day micro target
- Overall Stat **0%**, avg adherence **100.0%**, Rank **Silver II** 45 LP (pv 1145), current-week share **8.3%**

#### 6m
- **A07_P13_6m**: Weak start then improve / Single-day micro target
- Overall Stat **0%**, avg adherence **100.0%**, Rank **Gold IV** 72 LP (pv 1372), current-week share **5.6%**

#### 12m
- **A01_P20_12m**: Very consistent high performer / Unmapped trio only
- Overall Stat **0%**, avg adherence **100.0%**, Rank **Gold I** 92 LP (pv 1692), current-week share **2.1%**

#### 24m
- **A01_P20_24m**: Very consistent high performer / Unmapped trio only
- Overall Stat **0%**, avg adherence **100.0%**, Rank **Emerald IV** 92 LP (pv 2192), current-week share **1.0%**

#### 48m
- **A01_P20_48m**: Very consistent high performer / Unmapped trio only
- Overall Stat **0%**, avg adherence **100.0%**, Rank **Diamond II** 96 LP (pv 2796), current-week share **0.5%**

## Section 3 — Behavioral findings (patterns)

- **High Stats + mediocre Rank**: many completion **days** with **low ratio vs target** (especially high default targets) — Stats ignore targets; Rank penalizes low ratios.
- **High Rank + slower Stats**: strong **clamped adherence** on **few** weeks but **low raw volume** or **few mapped** habits — Rank grows on ratio×week LP; Stats need mapped completions × multipliers.
- **Similar Stats, different behaviors**: same exp-curve saturation from different raw paths (e.g. many weak weeks vs few strong weeks).
- **Similar Rank, different category profiles**: Rank is **not** category-based; similar `progressValue` can come from different habit sets.
- **Mapped vs unmapped**: unmapped habits can drive **Rank** but contribute **zero** to Stats.
- **Current-week-heavy**: spikes **Stats**; **Rank** barely moves if prior full weeks are empty.
- **Front-loaded users**: early Stats **multipliers** inflate cumulative raw totals vs later periods.

## Section 4 — Stat scaling interpretation

- **Overall / categories**: displayed as **% of STATS_MAX** after `1 - exp(-raw/K)` — **compressed** at high raw totals; interpretation shifts by **timeline** (longer history → easier to sit “high” on Overall if mapped activity persists).
- **Timeline**: at **1m**, low–mid % is common unless intense mapped logging; at **48m**, many archetypes approach **elite** on the curve if consistently active.
- **Global vs per-habit**: production Stats are **global** aggregates; per-habit interpretation is indirect (only via **mapping** and **volume**).
- **Misleading**: high % does not imply good **target adherence**; low % possible with **only unmapped** habits despite strong Rank.

## Section 5 — Per-habit scaling (current implementation)

- **Equal weight** per **completion day** per **mapped** stat key; **double-mapped** habits add the same weeklyCount×multiplier into **two** buckets.
- **Unmapped** habits: **invisible** to Stats.
- **No target awareness** in Stats; **quantity** settings not used.

## Section 6 — Anomalies & edge cases (covered by archetypes)

| Case | How it shows up |
|------|-----------------|
| Active but unmapped | Rank moves; Stats Overall may stay 0 |
| Many completions on low-target habits | Rank ratios near 1; Stats depend on mapping spread |
| Barely miss weekly target | Rank ratio <1; Stats still add partial week volume |
| Exceed target | Rank caps ratio at 1; Stats still count extra days |
| Strong recent-only | High current-week share; Rank Unranked or low weeksEvaluated |
| Strong past / weak recent | Stats cumulative; Rank LP only from full weeks with data |
| Same total completions / different targets | Different Rank ratios; Stats similar if mapping similar |

## Section 7 — Calibration cheat sheet (rule-of-thumb)

| Horizon | Overall % (mapped activity) | Notes |
|---------|------------------------------|-------|
| 1m | 0–25 typical light; 25–55 active; 55+ very strong mapped volume | Unstable if <4 weeks of data; unmapped-only → 0 |
| 3m | +10–20 pts vs 1m typical under continued use | Early multipliers taper |
| 6m | mid/high common for steady users | Curve compression |
| 12m | high values need consistent mapped logging | Compare to adherence, not only % |
| 24m / 48m | asymptotic band; small % moves = large raw history | Interpret vs Rank separately |

**Unstable / misleading**: unmapped-only users; current-week-only spikes; comparing Stats to Rank without adherence context.

## Section 8 — Recommendations (no code changes)

- **Cumulative Stats**: keep if the product goal is “lifetime signal”; expose **windowed** or **adherence-aware** metrics if the goal is “how well am I doing lately”.
- **Target-aware Stats**: would align interpretation with Rank and user mental models; tradeoff: more coupling to Targets configuration.
- **Exclude current week from Stats**: would reduce mismatch with Rank; tradeoff: Stats would feel less “live”.
- **Surface unmapped habits**: users may think Stats are “broken” when only unmapped habits are active.
- **Category clarity**: mapping is opaque; users may not know why Gym feeds two categories.

## Top 15 informative runs (by divergence score)

| # | ID | Timeline | Overall Stat % | Avg adh % | Rank | PV | Curr week % | Notes |
|---|----|----------|----------------|-----------|------|-----|-------------|-------|
| 1 | A01_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 2 | A01_P20_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 3 | A02_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 4 | A03_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 5 | A05_P20_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 6 | A06_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 7 | A10_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 8 | A10_P20_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 9 | A11_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 10 | A12_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 11 | A13_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 12 | A14_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 13 | A15_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 14 | A19_P13_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| 15 | A19_P20_3m | 3m | 0 | 100.0 | Silver II | 1145 | 8 | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |

## Top 10 — Stats vs Rank “different stories”

1. **A01_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.
2. **A01_P20_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. No stat-mapped active habits: Stats stay at 0; Rank still moves from completions vs targets.
3. **A02_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.
4. **A03_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.
5. **A05_P20_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. No stat-mapped active habits: Stats stay at 0; Rank still moves from completions vs targets.
6. **A06_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.
7. **A10_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.
8. **A10_P20_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. No stat-mapped active habits: Stats stay at 0; Rank still moves from completions vs targets.
9. **A11_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.
10. **A12_P13_3m** — Stat 0% vs adherence 100.0% vs Rank **Silver II** (1145 pv). Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios.

## Compact summary table (sample of high-divergence)

| Archetype | Timeline | Total comps | Avg adh | Overall Stat % | Rank | Main explanation |
|-----------|----------|-------------|---------|----------------|------|------------------|
| A01 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A01 | 3m | 180 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A02 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A03 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A05 | 3m | 252 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A06 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A10 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A10 | 3m | 180 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A11 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A12 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A13 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |
| A14 | 3m | 12 | 100.0% | 0% | Silver II | Mean adherence higher than Stats Overall: few mapped habits or exp curve / category skew can depress displayed Stats vs rank-style ratios. |

## Top 5 design risks (Stats system)

1. **Target-blind volume reward** can contradict Rank and user intent.
2. **Current week inclusion** diverges from Rank’s full-week-only evaluation.
3. **Unmapped habits** create “silent” activity in Stats.
4. **Early-week multipliers** distort cross-user comparison and late joiners.
5. **Global exp curve** hides per-habit and per-category tradeoffs behind single %s.
