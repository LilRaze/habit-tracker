/**
 * Display-only: map LoL-style rank + division to Valorant-style labels and asset names.
 * Does not affect ladder / LP / persistence.
 *
 * @typedef {{ valoRank: string, valoTier: number | null, valoAssetName: string, displayLabel: string }} ValoDisplayMapping
 */

const NUM_TO_ROMAN = { 4: 'IV', 3: 'III', 2: 'II', 1: 'I' }

/**
 * @param {string} valoRankName
 * @param {number | null} valoTier
 * @returns {ValoDisplayMapping}
 */
function buildValoResult(valoRankName, valoTier) {
  const hasTier = valoTier != null && Number.isFinite(valoTier)
  const valoAssetName = hasTier ? `${valoRankName}_${valoTier}` : valoRankName
  const displayLabel = hasTier ? `${valoRankName} ${valoTier}` : valoRankName
  return {
    valoRank: valoRankName,
    valoTier: hasTier ? valoTier : null,
    valoAssetName,
    displayLabel,
  }
}

/**
 * IV/III -> 1, II -> 2, I -> 3 (Iron–Platinum, Emerald→Diamond, Diamond→Ascendant).
 * @param {string} roman
 * @returns {1|2|3}
 */
function romanToValoTier123(roman) {
  if (roman === 'IV' || roman === 'III') return 1
  if (roman === 'II') return 2
  if (roman === 'I') return 3
  return 1
}

/**
 * @param {string} rank — LoL tier name (e.g. Iron, Gold, Master, Unranked, Challenger)
 * @param {string | null | undefined} division — IV, III, II, I, or null for apex / special
 * @param {{ apexDivision?: number }} [options] — 1–4 for Master/Grandmaster when rank has no division in ladder string
 * @returns {ValoDisplayMapping}
 */
export function mapLolDisplayToValo(rank, division, options = {}) {
  if (!rank || rank === 'Unranked') {
    return buildValoResult('Unranked', null)
  }

  if (rank === 'Challenger') {
    return buildValoResult('Radiant', null)
  }

  let roman = division
  if ((rank === 'Master' || rank === 'Grandmaster') && !roman) {
    const ad = options.apexDivision
    const n =
      ad != null && Number.isFinite(Number(ad)) ? Math.max(1, Math.min(4, Math.round(Number(ad)))) : 4
    roman = NUM_TO_ROMAN[n]
  }

  if (!roman || typeof roman !== 'string') {
    return buildValoResult('Unranked', null)
  }

  if (rank === 'Master') {
    if (roman === 'IV' || roman === 'III') return buildValoResult('Immortal', 1)
    if (roman === 'II' || roman === 'I') return buildValoResult('Immortal', 2)
    return buildValoResult('Immortal', 1)
  }

  if (rank === 'Grandmaster') {
    if (roman === 'IV' || roman === 'III') return buildValoResult('Immortal', 2)
    if (roman === 'II' || roman === 'I') return buildValoResult('Immortal', 3)
    return buildValoResult('Immortal', 2)
  }

  const t = romanToValoTier123(roman)

  if (rank === 'Iron') return buildValoResult('Iron', t)
  if (rank === 'Bronze') return buildValoResult('Bronze', t)
  if (rank === 'Silver') return buildValoResult('Silver', t)
  if (rank === 'Gold') return buildValoResult('Gold', t)
  if (rank === 'Platinum') return buildValoResult('Platinum', t)
  if (rank === 'Emerald') return buildValoResult('Diamond', t)
  if (rank === 'Diamond') return buildValoResult('Ascendant', t)

  return buildValoResult('Unranked', null)
}

/**
 * @param {string} rankString — full ladder label, e.g. "Gold II", "Master", "Unranked"
 * @param {{ apexDivision?: number }} [options]
 * @returns {ValoDisplayMapping}
 */
export function mapLolRankStringToValo(rankString, options = {}) {
  if (!rankString || typeof rankString !== 'string' || rankString === 'Unranked') {
    return mapLolDisplayToValo('Unranked', null, options)
  }

  const parts = rankString.trim().split(/\s+/)
  if (parts.length === 1) {
    const t = parts[0]
    if (t === 'Challenger') return mapLolDisplayToValo('Challenger', null, options)
    if (t === 'Master' || t === 'Grandmaster') return mapLolDisplayToValo(t, null, options)
    return mapLolDisplayToValo('Unranked', null, options)
  }

  const tier = parts[0]
  const roman = parts[1]
  return mapLolDisplayToValo(tier, roman, options)
}
