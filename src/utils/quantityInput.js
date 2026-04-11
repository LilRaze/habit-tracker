/**
 * Sanitize optional quantity text for personal tracking (km, hrs, min).
 * Non-negative numbers and empty string only; avoids NaN from rank/stat paths.
 */
export function sanitizeQuantityTrackingValue(raw) {
  const s = String(raw ?? '')
  let cleaned = s.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot !== -1) {
    cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
  }
  if (cleaned === '' || cleaned === '.') return cleaned
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n) || n < 0) return ''
  return cleaned
}
