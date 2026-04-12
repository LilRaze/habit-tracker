import { deriveRanksV4 } from './rankEngineV4'
import { ensureHabitTargetHistoryShape } from './habitTargetHistory'
import { migrateSnapshotHabitKeys } from './habitNameMigration'

/**
 * Normalize RPC row: may be flat columns or nested under `habit_user_state` / `state`.
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
function habitPayloadFromRpcRow(row) {
  if (!row || typeof row !== 'object') return row
  const nested = row.habit_user_state ?? row.state ?? row.snapshot
  if (nested && typeof nested === 'object') return nested
  return row
}

/**
 * True when row has enough cloud-shaped data to run the rank engine.
 * @param {Record<string, unknown>} payload
 */
export function friendRowHasSyncedRankPayload(payload) {
  if (!payload || typeof payload !== 'object') return false
  return (
    payload.completions != null &&
    typeof payload.completions === 'object' &&
    payload.target_days != null &&
    typeof payload.target_days === 'object' &&
    Array.isArray(payload.active_habits)
  )
}

/**
 * @param {Record<string, unknown>} row — one element from `get_friend_rank_inputs` result set
 * @returns {{
 *   userId: string,
 *   username: string | null,
 *   isSelf: false,
 *   hasSyncedData: boolean,
 *   progressSort: number,
 *   overallForDisplay: { rank: string, lp: number } | null,
 *   testRankOverride: object | null,
 * } | null}
 */
export function mapRpcRowToLeaderboardEntry(row) {
  if (!row || typeof row !== 'object') return null
  const userId = row.user_id ?? row.profile_id ?? row.id
  if (typeof userId !== 'string' || !userId) return null

  const username =
    typeof row.username === 'string' && row.username.trim() !== ''
      ? row.username
      : typeof row.user_username === 'string'
        ? row.user_username
        : null

  const payload = habitPayloadFromRpcRow(row)
  if (!friendRowHasSyncedRankPayload(payload)) {
    return {
      userId,
      username,
      isSelf: false,
      hasSyncedData: false,
      progressSort: -1,
      overallForDisplay: null,
      testRankOverride: null,
      rankSnapshot: null,
    }
  }

  const migrated = migrateSnapshotHabitKeys({
    completions: payload.completions,
    targetDays: payload.target_days,
    activeHabits: payload.active_habits,
    quantitySettings: payload.quantity_settings,
    habitConfigHistory: payload.habit_config_history,
    habitTargetHistory: payload.habit_target_history,
  })
  const { completions, targetDays, activeHabits, habitTargetHistory: rawTh } = migrated
  const habitTargetHistory = ensureHabitTargetHistoryShape(rawTh, targetDays)
  const testRankOverride =
    payload.test_rank_override && typeof payload.test_rank_override === 'object'
      ? payload.test_rank_override
      : null

  const rankData = deriveRanksV4(completions, targetDays, activeHabits, habitTargetHistory)
  const overallForDisplay =
    testRankOverride && typeof testRankOverride.rank === 'string'
      ? {
          rank: testRankOverride.rank,
          lp: Number.isFinite(Number(testRankOverride.lp)) ? Number(testRankOverride.lp) : 0,
        }
      : { rank: rankData.overall.rank, lp: rankData.overall.lp }

  return {
    userId,
    username,
    isSelf: false,
    hasSyncedData: true,
    progressSort: rankData.overall.progressValue ?? 0,
    overallForDisplay,
    testRankOverride,
    rankSnapshot: {
      completions,
      targetDays,
      activeHabits,
      habitTargetHistory,
    },
  }
}

/**
 * Same rank outputs as Rank tab for the signed-in user (local snapshot).
 */
export function buildSelfLeaderboardEntry(
  userId,
  username,
  completions,
  targetDays,
  activeHabits,
  habitTargetHistory,
  testRankOverride
) {
  if (!userId) return null
  const history = ensureHabitTargetHistoryShape(habitTargetHistory ?? null, targetDays ?? {})
  const rankData = deriveRanksV4(completions ?? {}, targetDays ?? {}, activeHabits ?? [], history)
  const overallForDisplay =
    testRankOverride && typeof testRankOverride.rank === 'string'
      ? {
          rank: testRankOverride.rank,
          lp: Number.isFinite(Number(testRankOverride.lp)) ? Number(testRankOverride.lp) : 0,
        }
      : { rank: rankData.overall.rank, lp: rankData.overall.lp }

  return {
    userId,
    username: username ?? 'You',
    isSelf: true,
    hasSyncedData: true,
    progressSort: rankData.overall.progressValue ?? 0,
    overallForDisplay,
    testRankOverride: testRankOverride ?? null,
    rankSnapshot: {
      completions: completions ?? {},
      targetDays: targetDays ?? {},
      activeHabits: activeHabits ?? [],
      habitTargetHistory: history,
    },
  }
}
