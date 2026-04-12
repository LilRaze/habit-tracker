import { STORAGE_TEST_TIME_OFFSET_MONTHS, STORAGE_TEST_TIME_OFFSET_DAYS } from './storageKeys'

/**
 * Virtual "now" for testing: applies month then day offsets from localStorage.
 * All app date logic should use this instead of `new Date()` for "today".
 */
export function getTimeOffsetMonths() {
  try {
    const raw = localStorage.getItem(STORAGE_TEST_TIME_OFFSET_MONTHS)
    if (raw == null || raw === '') return 0
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 0) return 0
    return n
  } catch {
    return 0
  }
}

export function setTimeOffsetMonths(months) {
  const n = Math.max(0, Math.floor(Number(months)) || 0)
  localStorage.setItem(STORAGE_TEST_TIME_OFFSET_MONTHS, String(n))
}

export function clearTimeOffsetMonths() {
  localStorage.removeItem(STORAGE_TEST_TIME_OFFSET_MONTHS)
}

export function getTimeOffsetDays() {
  try {
    const raw = localStorage.getItem(STORAGE_TEST_TIME_OFFSET_DAYS)
    if (raw == null || raw === '') return 0
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 0) return 0
    return n
  } catch {
    return 0
  }
}

export function setTimeOffsetDays(days) {
  const n = Math.max(0, Math.floor(Number(days)) || 0)
  localStorage.setItem(STORAGE_TEST_TIME_OFFSET_DAYS, String(n))
}

export function clearTimeOffsetDays() {
  localStorage.removeItem(STORAGE_TEST_TIME_OFFSET_DAYS)
}

export function getNow() {
  const d = new Date()
  const m = getTimeOffsetMonths()
  const dayOff = getTimeOffsetDays()
  if (m === 0 && dayOff === 0) return d
  const out = new Date(d.getTime())
  if (m !== 0) out.setMonth(out.getMonth() + m)
  if (dayOff !== 0) out.setDate(out.getDate() + dayOff)
  return out
}

/** Local calendar date YYYY-MM-DD for the virtual "today". */
export function getTodayDateString() {
  const d = getNow()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}
