import { LogIn, LogOut, Cloud, CloudOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './AuthBar.css'

export default function AuthBar({ cloudStatus, lastCloudError, onAfterSignOut }) {
  const { user, loading, signInWithGoogle, signOut, isConfigured } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    onAfterSignOut?.()
  }

  if (!isConfigured) {
    return (
      <div className="auth-bar auth-bar--offline">
        <CloudOff size={16} strokeWidth={2} aria-hidden />
        <span className="auth-bar-text">Sign-in unavailable (configure Supabase)</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="auth-bar">
        <Loader2 size={18} strokeWidth={2} className="auth-bar-spin" aria-hidden />
        <span className="auth-bar-text">Loading…</span>
      </div>
    )
  }

  if (user) {
    const email = user.email ?? user.user_metadata?.email ?? 'Signed in'
    const syncLabel =
      cloudStatus === 'loading'
        ? 'Syncing…'
        : cloudStatus === 'conflict'
          ? 'Resolve sync'
          : cloudStatus === 'error'
            ? 'Sync issue'
            : 'Saved to cloud'

    return (
      <div className="auth-bar auth-bar--signed-in">
        <div className="auth-bar-user">
          <Cloud size={16} strokeWidth={2} className="auth-bar-cloud-icon" aria-hidden />
          <span className="auth-bar-email" title={email}>
            {email}
          </span>
          <span className={`auth-bar-sync ${cloudStatus === 'error' ? 'auth-bar-sync--error' : ''}`}>
            {syncLabel}
          </span>
          {lastCloudError ? (
            <span className="auth-bar-error" title={lastCloudError}>
              ⚠
            </span>
          ) : null}
        </div>
        <button type="button" className="auth-bar-btn" onClick={handleSignOut}>
          <LogOut size={16} strokeWidth={2} />
          <span>Sign out</span>
        </button>
      </div>
    )
  }

  return (
    <div className="auth-bar">
      <button type="button" className="auth-bar-btn auth-bar-btn--primary" onClick={() => signInWithGoogle()}>
        <LogIn size={16} strokeWidth={2} />
        <span>Continue with Google</span>
      </button>
    </div>
  )
}
