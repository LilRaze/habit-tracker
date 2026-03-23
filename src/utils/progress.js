// Monday = first day of week, Sunday = last day
const DAYS_SINCE_MONDAY = (dayOfWeek) => (dayOfWeek + 6) % 7

function toLocalDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getWeekStartKey(date = new Date()) {
  const d = new Date(date)
  const offset = DAYS_SINCE_MONDAY(d.getDay())
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return toLocalDateString(d)
}

export function getPreviousWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return getWeekStartKey(d)
}

export function isDateInThisWeek(dateStr, refDate = new Date()) {
  const date = new Date(dateStr + 'T12:00:00')
  const ref = refDate instanceof Date ? refDate : new Date(refDate + 'T12:00:00')
  const weekStart = new Date(ref)
  const offset = DAYS_SINCE_MONDAY(weekStart.getDay())
  weekStart.setDate(weekStart.getDate() - offset)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return date >= weekStart && date <= weekEnd
}

export function getWeeklyCount(dates, refDate = new Date()) {
  return (dates ?? []).filter((d) => isDateInThisWeek(d, refDate)).length
}

export function getCountForWeekStart(dates, weekStartStr) {
  const weekStart = new Date(weekStartStr + 'T12:00:00')
  return (dates ?? []).filter((d) => isDateInThisWeek(d, weekStart)).length
}

export function addDaysToDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateString(d)
}
