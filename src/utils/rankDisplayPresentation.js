import { getHelmetImageUrlFromRank } from './rankAssets'
import { mapLolRankStringToValo } from './mapLolDisplayToValo'
import { getValoRankAssetUrl } from './valorantRankAssets'
import { RANK_LADDER } from '../data/ranks'

import unrankedImg from '../assets/ranks/unranked.webp'
import ironImg from '../assets/ranks/iron.webp'
import bronzeImg from '../assets/ranks/bronze.webp'
import silverImg from '../assets/ranks/silver.webp'
import goldImg from '../assets/ranks/gold.webp'
import platinumImg from '../assets/ranks/platinum.webp'
import emeraldImg from '../assets/ranks/emerald.webp'
import diamondImg from '../assets/ranks/diamond.webp'
import masterImg from '../assets/ranks/master.webp'
import grandmasterImg from '../assets/ranks/grandmaster.webp'
import challengerImg from '../assets/ranks/challenger.webp'

const TIER_IMAGES = {
  Unranked: unrankedImg,
  Iron: ironImg,
  Bronze: bronzeImg,
  Silver: silverImg,
  Gold: goldImg,
  Platinum: platinumImg,
  Emerald: emeraldImg,
  Diamond: diamondImg,
  Master: masterImg,
  Grandmaster: grandmasterImg,
  Challenger: challengerImg,
}

const RANK_OVERRIDES = {}

/**
 * Normalize odd labels (e.g. matrix interpolation "Iron IV/Unranked") to a real ladder
 * string when the prefix matches RANK_LADDER. Display + assets use this one string.
 * @param {string} rankString
 * @returns {string}
 */
export function normalizeLolRankStringForDisplay(rankString) {
  if (!rankString || typeof rankString !== 'string') return 'Unranked'
  const trimmed = rankString.trim()
  if (trimmed === '') return 'Unranked'
  if (trimmed.includes('/')) {
    const first = trimmed.split('/')[0].trim()
    if (first && RANK_LADDER.indexOf(first) >= 0) return first
  }
  return trimmed
}

function getTierFromRank(rank) {
  if (!rank || typeof rank !== 'string') return 'Unranked'
  if (rank === 'Unranked') return 'Unranked'
  const firstSegment = rank.includes('/') ? rank.split('/')[0].trim() : rank
  const tier = firstSegment.split(/\s+/)[0]
  return TIER_IMAGES[tier] ? tier : 'Unranked'
}

/** @param {string} normalizedRank — output of normalizeLolRankStringForDisplay */
function getLolFlatRankImageForNormalized(normalizedRank) {
  if (!normalizedRank) return unrankedImg
  return RANK_OVERRIDES[normalizedRank] ?? TIER_IMAGES[getTierFromRank(normalizedRank)] ?? unrankedImg
}

function getNextRankLabel(normalizedLolRank) {
  const i = RANK_LADDER.indexOf(normalizedLolRank)
  if (i < 0 || i >= RANK_LADDER.length - 1) return null
  return RANK_LADDER[i + 1]
}

/**
 * @typedef {{
 *   lolRank: string,
 *   normalizedRank: string,
 *   lp: number,
 *   displayLabel: string,
 *   emblemSrc: string,
 *   emblemWrapClassName: string,
 *   emblemImgClassName: string,
 *   nextRankLabel: string | null,
 *   valoMapping?: { valoRank: string, valoTier: number | null, valoAssetName: string, displayLabel: string }
 * }} RankDisplayView
 */

/** @typedef {'overall' | 'habit'} RankDisplayContext */

/**
 * Single canonical view for Rank screen: label, emblem, LP bar, and optional next rank
 * all derive from the same normalized ladder string + the lp passed in (no LP math here).
 *
 * @param {string} lolRankString — raw ladder label from engine / override
 * @param {number} lp — LP to show (0–100); same value used for the bar width
 * @param {{ theme: 'lol' | 'valorant', testRankOptions?: { apexDivision?: number }, context?: RankDisplayContext }} opts
 * @returns {RankDisplayView}
 */
export function buildRankDisplayView(lolRankString, lp, opts) {
  const { theme, testRankOptions, context: contextOpt } = opts
  /** @type {RankDisplayContext} */
  const context = contextOpt ?? 'habit'
  const options = testRankOptions ?? {}
  // All display paths use this one ladder string. To debug: import parseRankForHelmet from
  // './rankAssets' and log raw lolRankString, normalizedRank, parseRankForHelmet(normalizedRank, options),
  // nextRankLabel, theme === 'valorant' ? valoMapping : getTierFromRank(normalizedRank), displayLabel.
  const normalizedRank = normalizeLolRankStringForDisplay(lolRankString)
  const nextRankLabel = getNextRankLabel(normalizedRank)
  const lpSafe = Number.isFinite(Number(lp)) ? Math.max(0, Number(lp)) : 0

  let displayLabel
  let emblemSrc
  let emblemWrapClassName = 'rank-emblem-wrap'
  let emblemImgClassName = 'rank-emblem'
  /** @type {{ valoRank: string, valoTier: number | null, valoAssetName: string, displayLabel: string } | undefined} */
  let valoMapping

  if (theme === 'valorant') {
    valoMapping = mapLolRankStringToValo(normalizedRank, options)
    const url = getValoRankAssetUrl(valoMapping.valoAssetName)
    emblemSrc = url ?? unrankedImg
    displayLabel = valoMapping.displayLabel
  } else {
    displayLabel = normalizedRank
    if (context === 'overall') {
      // Emerald has no helmet set in public/helmet ranks; use the bundled flat emblem (same normalized rank as label).
      const tier = getTierFromRank(normalizedRank)
      if (tier === 'Emerald') {
        emblemSrc = getLolFlatRankImageForNormalized(normalizedRank)
      } else {
        emblemSrc = getHelmetImageUrlFromRank(normalizedRank, options)
        emblemWrapClassName = 'rank-emblem-wrap rank-emblem-wrap--helmet'
        emblemImgClassName = 'rank-emblem rank-emblem--helmet'
      }
    } else {
      emblemSrc = getLolFlatRankImageForNormalized(normalizedRank)
    }
  }

  return {
    lolRank: lolRankString,
    normalizedRank,
    lp: lpSafe,
    displayLabel,
    emblemSrc,
    emblemWrapClassName,
    emblemImgClassName,
    nextRankLabel,
    valoMapping,
  }
}

/**
 * @typedef {{
 *   displayLabel: string,
 *   emblemSrc: string,
 *   emblemWrapClassName: string,
 *   emblemImgClassName: string,
 *   valoMapping?: { valoRank: string, valoTier: number | null, valoAssetName: string, displayLabel: string }
 * }} RankCardPresentation
 */

/**
 * @param {string} lolRankString — ladder rank label
 * @param {{ theme: 'lol' | 'valorant', testRankOptions?: { apexDivision?: number }, context?: RankDisplayContext }} opts
 * @returns {RankCardPresentation}
 */
export function getRankCardPresentation(lolRankString, opts) {
  const view = buildRankDisplayView(lolRankString, 0, opts)
  return {
    displayLabel: view.displayLabel,
    emblemSrc: view.emblemSrc,
    emblemWrapClassName: view.emblemWrapClassName,
    emblemImgClassName: view.emblemImgClassName,
    valoMapping: view.valoMapping,
  }
}
