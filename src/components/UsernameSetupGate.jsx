import UsernameModal from './UsernameModal'
import { useProfile } from '../contexts/ProfileContext'

/** Blocks the app with a username form until a valid username exists (signed-in + Supabase only). */
export default function UsernameSetupGate() {
  const { needsUsernameSetup, saveUsername } = useProfile()

  if (!needsUsernameSetup) return null

  return (
    <UsernameModal
      open
      forceOpen
      title="Choose a username"
      initialValue=""
      submitLabel="Continue"
      onSubmit={saveUsername}
    />
  )
}
