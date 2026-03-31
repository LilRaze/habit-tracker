import { RANK_LADDER } from '../data/ranks'
import { STORAGE_TEST_RANK_OVERRIDE } from './storageKeys'

/**
 * @typedef {{ rank: string, lp: number, apexDivision?: number }} TestRankOverride
 */

function isValidLadderRank(rank) {
  return typeof rank === 'string' && RANK_LADDER.includes(rank)
}

export function loadTestRankOverride() {
  try {
    const raw = localStorage.getItem(STORAGE_TEST_RANK_OVERRIDE)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const rank = parsed.rank
    const lp = Number(parsed.lp)
    if (!isValidLadderRank(rank) || !Number.isFinite(lp)) return null
    const apex = parsed.apexDivision
    const apexDivision =
      apex != null && Number.isFinite(Number(apex))
        ? Math.max(1, Math.min(4, Math.round(Number(apex))))
        : undefined
    return {
      rank,
      lp: Math.max(0, Math.min(100, Math.round(lp))),
      ...(apexDivision != null ? { apexDivision } : {}),
    }
  } catch {
    return null
  }
}

/** @param {TestRankOverride | null} override */
export function saveTestRankOverride(override) {
  if (override == null) {
    localStorage.removeItem(STORAGE_TEST_RANK_OVERRIDE)
    return
  }
  localStorage.setItem(STORAGE_TEST_RANK_OVERRIDE, JSON.stringify(override))
}

export function clearTestRankOverride() {
  localStorage.removeItem(STORAGE_TEST_RANK_OVERRIDE)
}
