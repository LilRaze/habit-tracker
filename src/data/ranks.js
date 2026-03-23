export const RANK_LADDER = [
  'Unranked',
  'Iron IV', 'Iron III', 'Iron II', 'Iron I',
  'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Emerald IV', 'Emerald III', 'Emerald II', 'Emerald I',
  'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Master', 'Grandmaster', 'Challenger',
]

export function getLpChange(completed, target) {
  if (completed >= target) return completed > target ? 25 : 20
  const missBy = target - completed
  return missBy === 1 ? -15 : -25
}

export function applyLpAndRanks(currentRank, currentLp, lpChange) {
  let rankIndex = RANK_LADDER.indexOf(currentRank)
  if (rankIndex < 0) rankIndex = 0
  let lp = currentLp + lpChange

  while (lp >= 100 && rankIndex < RANK_LADDER.length - 1) {
    lp -= 100
    rankIndex += 1
  }

  while (lp < 0 && rankIndex > 0) {
    rankIndex -= 1
    lp = 75
  }

  if (lp < 0) lp = 0
  if (rankIndex >= RANK_LADDER.length) rankIndex = RANK_LADDER.length - 1

  return { rank: RANK_LADDER[rankIndex], lp }
}
