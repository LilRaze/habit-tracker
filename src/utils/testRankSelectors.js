import { RANK_LADDER } from '../data/ranks'

export const TEST_TIER_OPTIONS = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
  'Master',
  'Grandmaster',
  'Challenger',
]

export const TEST_DIVISION_ROMAN = ['IV', 'III', 'II', 'I']

const ROMAN_TO_NUM = { IV: 4, III: 3, II: 2, I: 1 }

const APEX_WITH_DIVISION_HELMS = new Set(['Master', 'Grandmaster'])

/**
 * Build a valid test rank override payload from Settings dropdowns.
 * @param {string} tier
 * @param {string} divisionRoman IV–I
 * @param {number} lp
 */
export function buildTestRankPayload(tier, divisionRoman, lp) {
  const safeLp = Math.max(0, Math.min(100, Math.round(Number(lp) || 0)))
  const apex = ROMAN_TO_NUM[divisionRoman] ?? 4

  if (!tier || !TEST_TIER_OPTIONS.includes(tier)) {
    return { rank: 'Unranked', lp: 0 }
  }

  if (tier === 'Challenger') {
    return { rank: 'Challenger', lp: safeLp }
  }

  if (APEX_WITH_DIVISION_HELMS.has(tier)) {
    return { rank: tier, lp: safeLp, apexDivision: apex }
  }

  const rank = `${tier} ${divisionRoman}`
  if (!RANK_LADDER.includes(rank)) return { rank: 'Unranked', lp: 0 }

  return { rank, lp: safeLp }
}
