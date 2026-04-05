import { STATS_CURVE_K, STATS_MAX } from '../data/stats'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Converts raw completion points into internal stats on [0, STATS_MAX].
 * Same curve as rawStatToDisplayWithK(raw, STATS_CURVE_K).
 */
export function rawStatToDisplayWithK(raw, curveK) {
  const K = Number.isFinite(curveK) && curveK > 0 ? curveK : STATS_CURVE_K
  const safeRaw = Number.isFinite(raw) ? Math.max(0, raw) : 0
  const displayed = STATS_MAX * (1 - Math.exp(-safeRaw / K))
  return Math.round(clamp(displayed, 0, STATS_MAX))
}

/**
 * Converts raw completion points into internal stats on [0, STATS_MAX].
 *
 * Recommended curve: STATS_MAX * (1 - exp(-raw / K))
 */
export function rawStatToDisplay(raw) {
  return rawStatToDisplayWithK(raw, STATS_CURVE_K)
}

/**
 * Apply display curve to raw bucket totals (same formula as deriveLongTermStats).
 */
export function deriveLongTermStatsDisplayFromRaw(rawTotals, curveK) {
  const strength = rawStatToDisplayWithK(rawTotals.strength, curveK)
  const health = rawStatToDisplayWithK(rawTotals.health, curveK)
  const intelligence = rawStatToDisplayWithK(rawTotals.intelligence, curveK)
  const discipline = rawStatToDisplayWithK(rawTotals.discipline, curveK)
  const overall = Math.round((strength + health + intelligence + discipline) / 4)
  return { strength, health, intelligence, discipline, overall }
}

export function internalStatToPercent(internal) {
  const safe = Number.isFinite(internal) ? Math.max(0, Math.min(STATS_MAX, internal)) : 0
  return Math.round((safe / STATS_MAX) * 100)
}

