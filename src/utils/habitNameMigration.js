/**
 * One-time display rename: canonical habit `name` in habits.js is the storage key everywhere
 * (completions, targetDays, activeHabits, quantitySettings, habitConfigHistory, habitTargetHistory, cloud JSON).
 * This module rewrites legacy keys so existing data survives when `name` changes.
 */
const LEGACY_TO_CANONICAL = {
  'No social media day': 'No social media',
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function mergeSortedUniqueDates(a, b) {
  const set = new Set()
  ;(a ?? []).forEach((d) => {
    if (typeof d === 'string' && DATE_RE.test(d)) set.add(d)
  })
  ;(b ?? []).forEach((d) => {
    if (typeof d === 'string' && DATE_RE.test(d)) set.add(d)
  })
  return [...set].sort()
}

/**
 * @param {Record<string, unknown>|null|undefined} completions
 */
export function migrateCompletions(completions) {
  if (!completions || typeof completions !== 'object') return completions
  let out = { ...completions }
  for (const [oldKey, newKey] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (!(oldKey in out)) continue
    const oldVal = out[oldKey]
    const nextVal = mergeSortedUniqueDates(Array.isArray(oldVal) ? oldVal : [], Array.isArray(out[newKey]) ? out[newKey] : [])
    out[newKey] = nextVal
    delete out[oldKey]
  }
  return out
}

/**
 * @param {Record<string, number[]>|null|undefined} targetDays
 */
function mergeDayIndices(a, b) {
  const set = new Set()
  ;(a ?? []).forEach((d) => {
    if (typeof d === 'number' && d >= 0 && d <= 6 && Number.isInteger(d)) set.add(d)
  })
  ;(b ?? []).forEach((d) => {
    if (typeof d === 'number' && d >= 0 && d <= 6 && Number.isInteger(d)) set.add(d)
  })
  return [...set].sort((x, y) => x - y)
}

export function migrateTargetDays(targetDays) {
  if (!targetDays || typeof targetDays !== 'object') return targetDays
  const out = { ...targetDays }
  for (const [oldKey, newKey] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (!(oldKey in out)) continue
    const oldArr = Array.isArray(out[oldKey]) ? out[oldKey] : []
    const newArr = Array.isArray(out[newKey]) ? out[newKey] : []
    out[newKey] = mergeDayIndices(oldArr, newArr)
    delete out[oldKey]
  }
  return out
}

/**
 * @param {string[]|null|undefined} activeHabits
 */
export function migrateActiveHabits(activeHabits) {
  if (!Array.isArray(activeHabits)) return activeHabits
  const map = new Map(Object.entries(LEGACY_TO_CANONICAL))
  return [...new Set(activeHabits.map((n) => (typeof n === 'string' ? map.get(n) ?? n : n)))]
}

/**
 * @param {Record<string, string>|null|undefined} quantitySettings
 */
export function migrateQuantitySettings(quantitySettings) {
  if (!quantitySettings || typeof quantitySettings !== 'object') return quantitySettings
  const out = { ...quantitySettings }
  for (const [oldKey, newKey] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (!(oldKey in out)) continue
    const oldVal = out[oldKey]
    const newVal = out[newKey]
    const pick =
      newVal != null && String(newVal).trim() !== '' ? newVal : oldVal != null ? oldVal : newVal
    out[newKey] = pick
    delete out[oldKey]
  }
  return out
}

/**
 * @param {Record<string, unknown[]>|null|undefined} habitConfigHistory
 */
export function migrateHabitConfigHistoryKeys(habitConfigHistory) {
  if (!habitConfigHistory || typeof habitConfigHistory !== 'object') return habitConfigHistory
  const out = { ...habitConfigHistory }
  for (const [oldKey, newKey] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (!(oldKey in out)) continue
    const oldList = Array.isArray(out[oldKey]) ? out[oldKey] : []
    const newList = Array.isArray(out[newKey]) ? out[newKey] : []
    if (newList.length === 0) {
      out[newKey] = oldList
    } else if (oldList.length > 0) {
      out[newKey] = [...oldList, ...newList].sort((a, b) =>
        String(a.effectiveFrom).localeCompare(String(b.effectiveFrom))
      )
    }
    delete out[oldKey]
  }
  return out
}

/**
 * @param {Record<string, unknown[]>|null|undefined} habitTargetHistory
 */
export function migrateHabitTargetHistoryKeys(habitTargetHistory) {
  if (!habitTargetHistory || typeof habitTargetHistory !== 'object') return habitTargetHistory
  const out = { ...habitTargetHistory }
  for (const [oldKey, newKey] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (!(oldKey in out)) continue
    const oldList = Array.isArray(out[oldKey]) ? out[oldKey] : []
    const newList = Array.isArray(out[newKey]) ? out[newKey] : []
    if (newList.length === 0) {
      out[newKey] = oldList
    } else if (oldList.length > 0) {
      out[newKey] = [...oldList, ...newList].sort((a, b) =>
        String(a.effectiveFrom).localeCompare(String(b.effectiveFrom))
      )
    }
    delete out[oldKey]
  }
  return out
}

/**
 * Migrate all habit-keyed snapshot fields (camelCase).
 * @param {Partial<{ completions: object, targetDays: object, activeHabits: string[], quantitySettings: object, habitConfigHistory: object, habitTargetHistory: object }>} snap
 */
export function migrateSnapshotHabitKeys(snap) {
  if (!snap || typeof snap !== 'object') return snap
  return {
    ...snap,
    completions: snap.completions != null ? migrateCompletions(snap.completions) : snap.completions,
    targetDays: snap.targetDays != null ? migrateTargetDays(snap.targetDays) : snap.targetDays,
    activeHabits: snap.activeHabits != null ? migrateActiveHabits(snap.activeHabits) : snap.activeHabits,
    quantitySettings:
      snap.quantitySettings != null ? migrateQuantitySettings(snap.quantitySettings) : snap.quantitySettings,
    habitConfigHistory:
      snap.habitConfigHistory != null
        ? migrateHabitConfigHistoryKeys(snap.habitConfigHistory)
        : snap.habitConfigHistory,
    habitTargetHistory:
      snap.habitTargetHistory != null
        ? migrateHabitTargetHistoryKeys(snap.habitTargetHistory)
        : snap.habitTargetHistory,
  }
}
