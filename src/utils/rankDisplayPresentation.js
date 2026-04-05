import { getHelmetImageUrlFromRank } from './rankAssets'
import { mapLolRankStringToValo } from './mapLolDisplayToValo'
import { getValoRankAssetUrl } from './valorantRankAssets'

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

function getTierFromRank(rank) {
  if (rank === 'Unranked') return 'Unranked'
  const tier = rank.split(' ')[0]
  return TIER_IMAGES[tier] ? tier : 'Unranked'
}

function getLolFlatRankImage(rank) {
  return RANK_OVERRIDES[rank] ?? TIER_IMAGES[getTierFromRank(rank)] ?? unrankedImg
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
 * @param {{ theme: 'lol' | 'valorant', testRankOptions?: { apexDivision?: number } }} opts
 * @returns {RankCardPresentation}
 */
export function getRankCardPresentation(lolRankString, opts) {
  const { theme, testRankOptions } = opts

  if (theme === 'valorant') {
    const valoMapping = mapLolRankStringToValo(lolRankString, testRankOptions ?? {})
    const url = getValoRankAssetUrl(valoMapping.valoAssetName)
    const emblemSrc = url ?? unrankedImg
    return {
      displayLabel: valoMapping.displayLabel,
      emblemSrc,
      emblemWrapClassName: 'rank-emblem-wrap',
      emblemImgClassName: 'rank-emblem',
      valoMapping,
    }
  }

  const tier = getTierFromRank(lolRankString)
  const usesFlatEmerald = tier === 'Emerald'
  const emblemSrc = usesFlatEmerald
    ? getLolFlatRankImage(lolRankString)
    : getHelmetImageUrlFromRank(lolRankString, testRankOptions ?? {})
  return {
    displayLabel: lolRankString,
    emblemSrc,
    emblemWrapClassName: usesFlatEmerald ? 'rank-emblem-wrap' : 'rank-emblem-wrap rank-emblem-wrap--helmet',
    emblemImgClassName: usesFlatEmerald ? 'rank-emblem' : 'rank-emblem rank-emblem--helmet',
  }
}
