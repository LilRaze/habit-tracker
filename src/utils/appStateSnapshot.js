import {
  loadCompletions,
  loadTargetDays,
  loadActiveHabits,
  loadHabitConfigHistory,
  loadQuantitySettings,
  persistCompletions,
  persistTargetDays,
  persistActiveHabits,
  persistHabitConfigHistory,
  persistQuantitySettings,
  getInitialCompletions,
  getInitialTargetDays,
  getInitialActiveHabits,
  getInitialQuantitySettings,
} from './persistedState'
import { ensureHabitConfigHistoryShape } from './habitConfigHistory'
import { migrateSnapshotHabitKeys } from './habitNameMigration'
import { loadRankVisualTheme, saveRankVisualTheme } from './rankVisualTheme'
import { loadTestRankOverride, saveTestRankOverride } from './testRankOverride'
import { getTimeOffsetMonths, setTimeOffsetMonths } from './now'

/** Fresh account / after reset (aligned with local defaults). */
export function getEmptySnapshot() {
  const activeHabits = getInitialActiveHabits()
  const targetDays = getInitialTargetDays()
  return {
    completions: getInitialCompletions(),
    targetDays,
    activeHabits,
    habitConfigHistory: ensureHabitConfigHistoryShape(null, activeHabits, targetDays),
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
 * @property {import('./habitConfigHistory').HabitConfigHistory} habitConfigHistory
 * @property {Record<string, string>} quantitySettings
 * @property {'lol'|'valorant'} rankVisualTheme
 * @property {import('./testRankOverride').TestRankOverride | null} [testRankOverride]
 * @property {number} timeOffsetMonths
 */

export function loadLocalSnapshot() {
  const activeHabits = loadActiveHabits()
  const targetDays = loadTargetDays()
  return {
    completions: loadCompletions(),
    targetDays,
    activeHabits,
    habitConfigHistory: loadHabitConfigHistory(activeHabits, targetDays),
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
  const migrated = migrateSnapshotHabitKeys({
    completions:
      row.completions && typeof row.completions === 'object' ? row.completions : getInitialCompletions(),
    targetDays:
      row.target_days && typeof row.target_days === 'object' ? row.target_days : getInitialTargetDays(),
    activeHabits: Array.isArray(row.active_habits) ? row.active_habits : getInitialActiveHabits(),
    quantitySettings:
      row.quantity_settings && typeof row.quantity_settings === 'object'
        ? row.quantity_settings
        : getInitialQuantitySettings(),
    habitConfigHistory:
      row.habit_config_history && typeof row.habit_config_history === 'object'
        ? row.habit_config_history
        : undefined,
  })
  const { completions, targetDays, activeHabits, quantitySettings, habitConfigHistory: rawHistory } = migrated
  return {
    completions,
    targetDays,
    activeHabits,
    habitConfigHistory: ensureHabitConfigHistoryShape(rawHistory, activeHabits, targetDays),
    quantitySettings,
    rankVisualTheme: row.rank_visual_theme === 'valorant' ? 'valorant' : 'lol',
    testRankOverride: local.testRankOverride,
    timeOffsetMonths: local.timeOffsetMonths,
  }
}

/** Normalize snapshot from row (fix property name quantity_settings -> quantitySettings). */
export function normalizeSnapshot(s) {
  const migrated = migrateSnapshotHabitKeys({
    completions: s.completions ?? getInitialCompletions(),
    targetDays: s.targetDays ?? s.target_days ?? getInitialTargetDays(),
    activeHabits: s.activeHabits ?? s.active_habits ?? getInitialActiveHabits(),
    quantitySettings: s.quantity_settings ?? s.quantitySettings ?? getInitialQuantitySettings(),
    habitConfigHistory: s.habit_config_history ?? s.habitConfigHistory,
  })
  const { completions, targetDays, activeHabits, quantitySettings: qty, habitConfigHistory: rawHistory } =
    migrated
  return {
    completions,
    targetDays,
    activeHabits,
    habitConfigHistory: ensureHabitConfigHistoryShape(rawHistory, activeHabits, targetDays),
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
    habitConfigHistory: n.habitConfigHistory,
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
    habit_config_history: n.habitConfigHistory,
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
  persistHabitConfigHistory(n.habitConfigHistory)
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
