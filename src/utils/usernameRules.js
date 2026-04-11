/**
 * Client rules: required, trim, lowercase for storage, 3–20 chars, [a-z0-9_]
 * @param {string} raw
 * @returns {{ ok: true, normalized: string } | { ok: false, message: string }}
 */
export function validateUsername(raw) {
  if (raw == null || typeof raw !== 'string') {
    return { ok: false, message: 'Username is required.' }
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, message: 'Username is required.' }
  }
  const normalized = trimmed.toLowerCase()
  if (normalized.length < 3 || normalized.length > 20) {
    return { ok: false, message: 'Username must be 3–20 characters.' }
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      ok: false,
      message: 'Only letters, numbers, and underscores are allowed.',
    }
  }
  return { ok: true, normalized }
}

export function profileHasValidUsername(profile) {
  if (!profile || typeof profile.username !== 'string') return false
  const v = validateUsername(profile.username)
  return v.ok
}
