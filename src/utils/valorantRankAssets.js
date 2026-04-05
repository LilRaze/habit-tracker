/**
 * Valorant rank images live under `src/assets/ValoRanks/`.
 * File names (no extension): Unranked, Radiant, Iron_1…3, Bronze_1…3, …, Immortal_1…3
 */
const valoModules = import.meta.glob('../assets/ValoRanks/*', { eager: true, import: 'default' })

/** @type {Record<string, string>} */
const VALO_URL_BY_ASSET_NAME = {}

for (const path of Object.keys(valoModules)) {
  const file = path.split('/').pop()
  if (!file) continue
  const base = file.replace(/\.[^.]+$/, '')
  if (base) VALO_URL_BY_ASSET_NAME[base] = valoModules[path]
}

/**
 * @param {string} assetName — e.g. Gold_2, Unranked, Radiant
 * @returns {string | undefined} resolved URL when the file exists
 */
export function getValoRankAssetUrl(assetName) {
  if (!assetName || typeof assetName !== 'string') return undefined
  return VALO_URL_BY_ASSET_NAME[assetName]
}

export function hasValoAsset(assetName) {
  return Boolean(assetName && VALO_URL_BY_ASSET_NAME[assetName])
}
