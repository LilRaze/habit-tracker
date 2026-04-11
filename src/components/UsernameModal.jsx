import { useEffect, useState } from 'react'
import './UsernameModal.css'

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.initialValue
 * @param {string} props.submitLabel
 * @param {boolean} [props.forceOpen] — no cancel / backdrop dismiss
 * @param {(username: string) => Promise<{ error?: string | null }>} props.onSubmit
 * @param {() => void} [props.onClose]
 */
export default function UsernameModal({
  open,
  title,
  initialValue = '',
  submitLabel = 'Save',
  forceOpen = false,
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(initialValue)
  const [localError, setLocalError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setLocalError('')
      setSaving(false)
    }
  }, [open, initialValue])

  if (!open) return null

  const handleBackdrop = () => {
    if (forceOpen || saving) return
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSaving(true)
    try {
      const result = await onSubmit(value)
      if (result?.error) {
        setLocalError(result.error)
        setSaving(false)
        return
      }
      if (!forceOpen) onClose?.()
    } catch {
      setLocalError('Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="username-modal-root" role="presentation">
      <button
        type="button"
        className="username-modal-backdrop"
        aria-label={forceOpen ? undefined : 'Close'}
        onClick={handleBackdrop}
        disabled={forceOpen || saving}
      />
      <div className="username-modal-card" role="dialog" aria-modal="true" aria-labelledby="username-modal-title">
        <h2 id="username-modal-title" className="username-modal-title">
          {title}
        </h2>
        <p className="username-modal-hint">
          3–20 characters, letters, numbers, and underscores only. Stored in lowercase.
        </p>
        <form onSubmit={handleSubmit} className="username-modal-form">
          <label className="username-modal-label">
            <span>Username</span>
            <input
              className="username-modal-input"
              type="text"
              autoComplete="username"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={32}
              disabled={saving}
            />
          </label>
          {localError ? <p className="username-modal-error">{localError}</p> : null}
          <div className="username-modal-actions">
            {!forceOpen ? (
              <button type="button" className="username-modal-btn username-modal-btn--ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
            ) : null}
            <button type="submit" className="username-modal-btn username-modal-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
