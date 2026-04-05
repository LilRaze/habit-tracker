import {
  addDaysToDateStr,
  getWeekStartKey,
  getCountForWeekStart,
} from '../../../src/utils/progress.js'

/** All Monday week-start keys from startMonday through endMonday inclusive. */
export function enumerateWeekStarts(startMondayStr, endMondayStr) {
  const out = []
  let w = startMondayStr
  while (w <= endMondayStr) {
    out.push(w)
    w = addDaysToDateStr(w, 7)
  }
  return out
}

export { addDaysToDateStr, getWeekStartKey, getCountForWeekStart }
