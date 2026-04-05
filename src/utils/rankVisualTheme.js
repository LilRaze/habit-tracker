import { STORAGE_RANK_VISUAL_THEME } from './storageKeys'

/** @returns {'lol' | 'valorant'} */
export function loadRankVisualTheme() {
  try {
    const v = localStorage.getItem(STORAGE_RANK_VISUAL_THEME)
    if (v === 'valorant') return 'valorant'
    return 'lol'
  } catch {
    return 'lol'
  }
}

/** @param {'lol' | 'valorant'} theme */
export function saveRankVisualTheme(theme) {
  try {
    if (theme === 'valorant') {
      localStorage.setItem(STORAGE_RANK_VISUAL_THEME, 'valorant')
    } else {
      localStorage.setItem(STORAGE_RANK_VISUAL_THEME, 'lol')
    }
  } catch {
    /* ignore */
  }
}
