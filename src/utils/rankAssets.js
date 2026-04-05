/** Public URL base (files live under `public/helmet ranks/`) */
const HELMET_BASE = '/helmet ranks'

const ROMAN_TO_DIVISION = {
  IV: 4,
  III: 3,
  II: 2,
  I: 1,
}

/** Tiers that use Roman divisions in rank strings (for parsing). */
const TIER_WITH_ROMAN_DIVISIONS = new Set([
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
])

/**
 * Tiers that have helmet image files under `public/helmet ranks/`.
 * Emerald uses the flat tier asset from `src/assets/ranks/emerald.webp` in Rank.jsx instead.
 */
const TIER_WITH_HELMET_FILES = new Set([
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
])

/**
 * @param {string} rankTier
 * @param {number | undefined | null} division 1–IV as 1–4; IV is 4, I is 1
 * @returns {string} Encoded URL to the helmet asset
 */
export function getHelmetImagePath(rankTier, division) {
  if (!rankTier || rankTier === 'Unranked') {
    return encodeHelmetPath(`${HELMET_BASE}/Unranked.webp`)
  }

  if (rankTier === 'Challenger') {
    return encodeHelmetPath(`${HELMET_BASE}/Challenger.webp`)
  }

  if (rankTier === 'Master' || rankTier === 'Grandmaster') {
    const d = normalizeApexDivision(division)
    const ext = '.webp'
    const file =
      rankTier === 'Master'
        ? `${HELMET_BASE}/Master${d}${ext}`
        : `${HELMET_BASE}/Grandmaster${d}${ext}`
    return encodeHelmetPath(file)
  }

  if (TIER_WITH_HELMET_FILES.has(rankTier)) {
    const d = normalizeTieredDivision(division)
    const ext = '.webp'
    return encodeHelmetPath(`${HELMET_BASE}/${rankTier}${d}${ext}`)
  }

  return encodeHelmetPath(`${HELMET_BASE}/Unranked.webp`)
}

/**
 * @param {string} rank - Full ladder string, e.g. "Iron IV", "Master", "Unranked"
 * @param {{ apexDivision?: number }} [options] - For Master / Grandmaster when ladder rank has no division (test override)
 * @returns {{ tier: string, division: number | undefined }}
 */
export function parseRankForHelmet(rank, options = {}) {
  if (!rank || typeof rank !== 'string' || rank === 'Unranked') {
    return { tier: 'Unranked', division: undefined }
  }

  const parts = rank.trim().split(/\s+/)
  if (parts.length === 1) {
    const t = parts[0]
    if (t === 'Challenger') {
      return { tier: 'Challenger', division: undefined }
    }
    if (t === 'Master') {
      const ad = options.apexDivision
      return {
        tier: 'Master',
        division:
          ad != null && Number.isFinite(Number(ad))
            ? Math.max(1, Math.min(4, Math.round(Number(ad))))
            : undefined,
      }
    }
    if (t === 'Grandmaster') {
      const ad = options.apexDivision
      return {
        tier: 'Grandmaster',
        division:
          ad != null && Number.isFinite(Number(ad))
            ? Math.max(1, Math.min(4, Math.round(Number(ad))))
            : undefined,
      }
    }
    return { tier: 'Unranked', division: undefined }
  }

  const tier = parts[0]
  const roman = parts[1]
  const division = ROMAN_TO_DIVISION[roman]

  if (division === undefined || !TIER_WITH_ROMAN_DIVISIONS.has(tier)) {
    return { tier: 'Unranked', division: undefined }
  }

  return { tier, division }
}

/**
 * @param {string} rank - Full ladder rank string
 * @param {{ apexDivision?: number }} [options]
 */
export function getHelmetImageUrlFromRank(rank, options = {}) {
  const { tier, division } = parseRankForHelmet(rank, options)
  return getHelmetImagePath(tier, division)
}

/** @deprecated Use getHelmetImagePath */
export function getHelmetImage(rankTier, division) {
  return getHelmetImagePath(rankTier, division)
}

function encodeHelmetPath(path) {
  return encodeURI(path)
}

function normalizeTieredDivision(division) {
  if (division == null || !Number.isFinite(Number(division))) return 4
  const n = Math.round(Number(division))
  if (n < 1 || n > 4) return 4
  return n
}

function normalizeApexDivision(division) {
  if (division == null || !Number.isFinite(Number(division))) return 4
  const n = Math.round(Number(division))
  if (n < 1 || n > 4) return 4
  return n
}
