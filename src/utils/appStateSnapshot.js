import {
  loadCompletions,
  loadTargetDays,
  loadActiveHabits,
  loadQuantitySettings,
  persistCompletions,
  persistTargetDays,
  persistActiveHabits,
  persistQuantitySettings,
  getInitialCompletions,
  getInitialTargetDays,
  getInitialActiveHabits,
  getInitialQuantitySettings,
} from './persistedState'
import { loadRankVisualTheme, saveRankVisualTheme } from './rankVisualTheme'
import { loadTestRankOverride, saveTestRankOverride } from './testRankOverride'
import { getTimeOffsetMonths, setTimeOffsetMonths } from './now'

/** Fresh account / after reset (aligned with local defaults). */
export function getEmptySnapshot() {
  return {
    completions: getInitialCompletions(),
    targetDays: getInitialTargetDays(),
    activeHabits: getInitialActiveHabits(),
    quantitySettings: getInitialQuantitySettings(),
    rankVisualTheme: 'lol',
    testRankOverride: null,
    timeOffsetMonths: 0,
  }
}

/**
 * @typedef {Object} AppStateSnapshot
 * @property {Record<string, string[]>} completions
 * @property {Record<string, number[]>} targetDays
 * @property {string[]} activeHabits
 * @property {Record<string, string>} quantitySettings
 * @property {'lol'|'valorant'} rankVisualTheme
 * @property {import('./testRankOverride').TestRankOverride | null} [testRankOverride]
 * @property {number} timeOffsetMonths
 */

export function loadLocalSnapshot() {
  return {
    completions: loadCompletions(),
    targetDays: loadTargetDays(),
    activeHabits: loadActiveHabits(),
    quantitySettings: loadQuantitySettings(),
    rankVisualTheme: loadRankVisualTheme(),
    testRankOverride: loadTestRankOverride(),
    timeOffsetMonths: getTimeOffsetMonths(),
  }
}

/**
 * Map Supabase row to snapshot. Test rank + time offset always come from **local** storage, not the row.
 * @param {Record<string, unknown>} row
 * @returns {AppStateSnapshot}
 */
export function rowToSnapshot(row) {
  const local = loadLocalSnapshot()
  return {
    completions:
      row.completions && typeof row.completions === 'object' ? row.completions : getInitialCompletions(),
    targetDays:
      row.target_days && typeof row.target_days === 'object' ? row.target_days : getInitialTargetDays(),
    activeHabits: Array.isArray(row.active_habits) ? row.active_habits : getInitialActiveHabits(),
    quantitySettings:
      row.quantity_settings && typeof row.quantity_settings === 'object'
        ? row.quantity_settings
        : getInitialQuantitySettings(),
    rankVisualTheme: row.rank_visual_theme === 'valorant' ? 'valorant' : 'lol',
    testRankOverride: local.testRankOverride,
    timeOffsetMonths: local.timeOffsetMonths,
  }
}

/** Normalize snapshot from row (fix property name quantity_settings -> quantitySettings). */
export function normalizeSnapshot(s) {
  const qty = s.quantity_settings ?? s.quantitySettings ?? getInitialQuantitySettings()
  return {
    completions: s.completions ?? getInitialCompletions(),
    targetDays: s.targetDays ?? getInitialTargetDays(),
    activeHabits: s.activeHabits ?? getInitialActiveHabits(),
    quantitySettings: qty,
    rankVisualTheme:
      s.rankVisualTheme === 'valorant' || s.rank_visual_theme === 'valorant' ? 'valorant' : 'lol',
    testRankOverride: s.testRankOverride ?? null,
    timeOffsetMonths:
      typeof s.timeOffsetMonths === 'number'
        ? s.timeOffsetMonths
        : typeof s.time_offset_months === 'number'
          ? s.time_offset_months
          : 0,
  }
}

/** Subset used for conflict detection (excludes dev-only fields so local test tools don’t force a false conflict). */
export function snapshotCloudComparable(s) {
  const n = normalizeSnapshot(s)
  return {
    completions: n.completions,
    targetDays: n.targetDays,
    activeHabits: n.activeHabits,
    quantitySettings: n.quantitySettings,
    rankVisualTheme: n.rankVisualTheme,
  }
}

/**
 * Payload for Supabase — **never** persist dev/test tools or virtual time (alpha hardening).
 */
export function snapshotToCloudPayload(snapshot) {
  const n = normalizeSnapshot(snapshot)
  return {
    completions: n.completions,
    target_days: n.targetDays,
    active_habits: n.activeHabits,
    quantity_settings: n.quantitySettings,
    rank_visual_theme: n.rankVisualTheme,
    test_rank_override: null,
    time_offset_months: 0,
  }
}

/**
 * Persist snapshot to localStorage + side-effect helpers (time offset, rank theme, test rank).
 * @param {AppStateSnapshot} snapshot
 */
export function persistSnapshotToLocal(snapshot) {
  const n = normalizeSnapshot(snapshot)
  persistCompletions(n.completions)
  persistTargetDays(n.targetDays)
  persistActiveHabits(n.activeHabits)
  persistQuantitySettings(n.quantitySettings)
  saveRankVisualTheme(n.rankVisualTheme)
  saveTestRankOverride(n.testRankOverride)
  setTimeOffsetMonths(n.timeOffsetMonths)
}

/** Deep compare full snapshots (e.g. debug). */
export function snapshotsEqual(a, b) {
  return JSON.stringify(normalizeSnapshot(a)) === JSON.stringify(normalizeSnapshot(b))
}

/** Compare only data that is actually synced to the cloud. */
export function snapshotsEqualCloudRelevant(a, b) {
  return JSON.stringify(snapshotCloudComparable(a)) === JSON.stringify(snapshotCloudComparable(b))
}
