/**
 * Local persistence (localStorage) — same shape as cloud row for sync.
 * Validation mirrors previous App.jsx loaders.
 */
import { habits } from '../data/habits'
import {
  STORAGE_COMPLETIONS,
  STORAGE_TARGET_DAYS,
  STORAGE_ACTIVE_HABITS,
  STORAGE_QUANTITY_SETTINGS,
} from './storageKeys'

const initialCompletions = {}
habits.forEach((h) => {
  initialCompletions[h.name] = []
})

export function getInitialCompletions() {
  return { ...initialCompletions }
}

export function loadCompletions() {
  try {
    const stored = localStorage.getItem(STORAGE_COMPLETIONS)
    if (!stored) return { ...initialCompletions }
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return { ...initialCompletions }
    const result = { ...initialCompletions }
    habits.forEach((h) => {
      if (Array.isArray(parsed[h.name])) {
        result[h.name] = parsed[h.name].filter(
          (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
        )
      }
    })
    return result
  } catch {
    return { ...initialCompletions }
  }
}

export function getInitialTargetDays() {
  const data = {}
  habits.forEach((h) => {
    data[h.name] = Array.from({ length: h.defaultWeeklyTarget }, (_, i) => i)
  })
  return data
}

export function loadTargetDays() {
  try {
    const stored = localStorage.getItem(STORAGE_TARGET_DAYS)
    if (!stored) return getInitialTargetDays()
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return getInitialTargetDays()
    const result = getInitialTargetDays()
    habits.forEach((h) => {
      if (Array.isArray(parsed[h.name])) {
        const valid = parsed[h.name].filter(
          (d) => typeof d === 'number' && d >= 0 && d <= 6 && Number.isInteger(d)
        )
        result[h.name] = [...new Set(valid)].sort((a, b) => a - b)
      }
    })
    return result
  } catch {
    return getInitialTargetDays()
  }
}

export function getInitialActiveHabits() {
  return []
}

export function loadActiveHabits() {
  try {
    const stored = localStorage.getItem(STORAGE_ACTIVE_HABITS)
    if (!stored) return getInitialActiveHabits()
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return getInitialActiveHabits()
    const validNames = new Set(habits.map((h) => h.name))
    return [...new Set(parsed.filter((name) => typeof name === 'string' && validNames.has(name)))]
  } catch {
    return getInitialActiveHabits()
  }
}

export function getInitialQuantitySettings() {
  const data = {}
  habits.forEach((h) => {
    data[h.name] = ''
  })
  return data
}

export function loadQuantitySettings() {
  try {
    const stored = localStorage.getItem(STORAGE_QUANTITY_SETTINGS)
    if (!stored) return getInitialQuantitySettings()
    const parsed = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return getInitialQuantitySettings()
    const result = getInitialQuantitySettings()
    habits.forEach((h) => {
      const value = parsed[h.name]
      if (typeof value === 'string') result[h.name] = value
      if (typeof value === 'number') result[h.name] = String(value)
    })
    return result
  } catch {
    return getInitialQuantitySettings()
  }
}

export function persistCompletions(completions) {
  localStorage.setItem(STORAGE_COMPLETIONS, JSON.stringify(completions))
}

export function persistTargetDays(targetDays) {
  localStorage.setItem(STORAGE_TARGET_DAYS, JSON.stringify(targetDays))
}

export function persistActiveHabits(activeHabits) {
  localStorage.setItem(STORAGE_ACTIVE_HABITS, JSON.stringify(activeHabits))
}

export function persistQuantitySettings(quantitySettings) {
  localStorage.setItem(STORAGE_QUANTITY_SETTINGS, JSON.stringify(quantitySettings))
}

/** True if local data looks like real usage (not empty defaults). */
export function hasMeaningfulLocalData(snapshot) {
  const { completions, activeHabits } = snapshot
  if (activeHabits && activeHabits.length > 0) return true
  if (!completions || typeof completions !== 'object') return false
  return Object.values(completions).some((dates) => Array.isArray(dates) && dates.length > 0)
}
