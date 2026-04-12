import { useMemo, useState } from 'react'
import { LogIn, LogOut, Loader2, Cloud, CloudOff, AlertCircle } from 'lucide-react'
import { habits } from '../data/habits'
import {
  TEST_TIER_OPTIONS,
  TEST_DIVISION_ROMAN,
  buildTestRankPayload,
} from '../utils/testRankSelectors'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import UsernameModal from '../components/UsernameModal'
import FriendsPanel from '../components/FriendsPanel'
import './Settings.css'

function cloudStatusLabel(cloudStatus) {
  if (cloudStatus === 'loading') return 'Syncing…'
  if (cloudStatus === 'conflict') return 'Resolve sync'
  if (cloudStatus === 'error') return 'Sync issue'
  if (cloudStatus === 'ready') return 'Saved to cloud'
  return 'Cloud idle'
}

const SIM_MONTH_OPTIONS = [1, 3, 6, 12, 24, 36, 48, 60]

const SIM_PRESET_SCENARIOS = [
  {
    id: 'fairness-100',
    label: '100% adherence fairness',
    months: 6,
    selectedHabits: ['Gym', 'No phone'],
    targetsByHabit: { Gym: 3, 'No phone': 1 },
    achievedByHabit: { Gym: 3, 'No phone': 1 },
    forcePerfect: true,
  },
  {
    id: 'partial-consistency',
    label: 'Partial consistency',
    months: 6,
    selectedHabits: ['Gym', 'No phone', 'Study', 'No junk food'],
    targetsByHabit: { Gym: 3, 'No phone': 3, Study: 5, 'No junk food': 4 },
    achievedByHabit: { Gym: 2, 'No phone': 1, Study: 3, 'No junk food': 2 },
  },
  {
    id: 'balanced-1y',
    label: 'Balanced user (1 year)',
    months: 12,
    selectedHabits: [
      'Gym',
      'Running',
      'Walk goal',
      'Sports',
      'Sleep',
      'No alcohol',
      'Shower',
      'Dental care',
      'Study',
      'Read book',
      'Language learning',
      'Meditation',
    ],
    targetsByHabit: {
      Gym: 3,
      Running: 3,
      'Walk goal': 4,
      Sports: 3,
      Sleep: 5,
      'No alcohol': 4,
      Shower: 4,
      'Dental care': 4,
      Study: 4,
      'Read book': 4,
      'Language learning': 4,
      Meditation: 4,
    },
    achievedByHabit: {
      Gym: 3,
      Running: 3,
      'Walk goal': 3,
      Sports: 2,
      Sleep: 4,
      'No alcohol': 3,
      Shower: 3,
      'Dental care': 3,
      Study: 3,
      'Read book': 3,
      'Language learning': 3,
      Meditation: 3,
    },
  },
  {
    id: 'physical-focused',
    label: 'Physical focused',
    months: 12,
    selectedHabits: ['Gym', 'Running', 'Walk goal', 'Sports', 'Sleep', 'Shower', 'Cold shower'],
    targetsByHabit: { Gym: 4, Running: 4, 'Walk goal': 5, Sports: 3, Sleep: 5, Shower: 5, 'Cold shower': 3 },
    achievedByHabit: { Gym: 3, Running: 3, 'Walk goal': 4, Sports: 2, Sleep: 4, Shower: 4, 'Cold shower': 2 },
  },
  {
    id: 'mental-focused',
    label: 'Mental focused',
    months: 12,
    selectedHabits: [
      'Study',
      'Work on skill',
      'Language learning',
      'Read book',
      'Meditation',
      'Journaling',
      'Reflection',
      'No phone',
      'Help someone',
      'Spend time with family',
      'Meet someone new',
    ],
    targetsByHabit: {
      Study: 5,
      'Work on skill': 4,
      'Language learning': 4,
      'Read book': 4,
      Meditation: 4,
      Journaling: 4,
      Reflection: 3,
      'No phone': 3,
      'Help someone': 2,
      'Spend time with family': 3,
      'Meet someone new': 2,
    },
    achievedByHabit: {
      Study: 4,
      'Work on skill': 3,
      'Language learning': 3,
      'Read book': 3,
      Meditation: 3,
      Journaling: 3,
      Reflection: 2,
      'No phone': 2,
      'Help someone': 2,
      'Spend time with family': 2,
      'Meet someone new': 1,
    },
  },
  {
    id: 'elite-2y',
    label: 'Elite (2 years)',
    months: 24,
    selectedHabits: [
      'Gym',
      'Running',
      'Walk goal',
      'Sports',
      'No junk food',
      'Sleep',
      'No alcohol',
      'Shower',
      'Dental care',
      'Cold shower',
      'Clean room',
      'Laundry',
      'Study',
      'Work on skill',
      'Language learning',
      'Read book',
      'Meditation',
      'Journaling',
      'Reflection',
      'No phone',
      'Help someone',
      'Spend time with family',
      'Meet someone new',
    ],
    targetsByHabit: {
      Gym: 5,
      Running: 4,
      'Walk goal': 7,
      Sports: 4,
      'No junk food': 4,
      Sleep: 7,
      'No alcohol': 5,
      Shower: 5,
      'Dental care': 5,
      'Cold shower': 4,
      'Clean room': 3,
      Laundry: 3,
      Study: 5,
      'Work on skill': 4,
      'Language learning': 5,
      'Read book': 4,
      Meditation: 4,
      Journaling: 4,
      Reflection: 3,
      'No phone': 4,
      'Help someone': 3,
      'Spend time with family': 3,
      'Meet someone new': 2,
    },
    achievedByHabit: {
      Gym: 5,
      Running: 4,
      'Walk goal': 6,
      Sports: 4,
      'No junk food': 4,
      Sleep: 6,
      'No alcohol': 5,
      Shower: 5,
      'Dental care': 4,
      'Cold shower': 4,
      'Clean room': 3,
      Laundry: 3,
      Study: 5,
      'Work on skill': 4,
      'Language learning': 5,
      'Read book': 4,
      Meditation: 4,
      Journaling: 4,
      Reflection: 3,
      'No phone': 4,
      'Help someone': 3,
      'Spend time with family': 3,
      'Meet someone new': 2,
    },
    forcePerfect: true,
  },
  {
    id: 'inconsistent',
    label: 'Inconsistent',
    months: 6,
    selectedHabits: ['Gym', 'No phone', 'Study', 'No junk food'],
    targetsByHabit: { Gym: 4, 'No phone': 4, Study: 5, 'No junk food': 4 },
    achievedByHabit: { Gym: 1, 'No phone': 2, Study: 2, 'No junk food': 1 },
  },
  {
    id: 'single-habit',
    label: 'Single habit',
    months: 12,
    selectedHabits: ['Study'],
    targetsByHabit: { Study: 5 },
    achievedByHabit: { Study: 5 },
  },
]

function Settings({
  onResetAllProgress,
  onApplySimulation,
  onApplyTestRank,
  rankVisualTheme = 'lol',
  onRankVisualThemeChange,
  cloudStatus = 'idle',
  lastCloudError,
  onAfterSignOut,
}) {
  const { user, loading: authLoading, signInWithGoogle, signOut, isConfigured } = useAuth()
  const { profile, status: profileStatus, loadError: profileLoadError, refreshProfile, saveUsername } = useProfile()
  const [usernameEditOpen, setUsernameEditOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    onAfterSignOut?.()
  }

  const handleSaveUsernameEdit = async (raw) => {
    const result = await saveUsername(raw)
    if (!result?.error) setUsernameEditOpen(false)
    return result ?? { error: null }
  }

  const [scenarioPassword, setScenarioPassword] = useState('')
  const [scenarioUnlocked, setScenarioUnlocked] = useState(false)
  const [scenarioError, setScenarioError] = useState('')
  const [simulationMonths, setSimulationMonths] = useState(6)
  const [selectedSimHabits, setSelectedSimHabits] = useState([])
  const [targetsByHabit, setTargetsByHabit] = useState({})
  const [achievedByHabit, setAchievedByHabit] = useState({})

  const selectedSet = useMemo(() => new Set(selectedSimHabits), [selectedSimHabits])
  const selectedHabitList = useMemo(
    () => habits.filter((h) => selectedSet.has(h.name)),
    [selectedSet]
  )

  const toggleSimHabit = (habit) => {
    const habitName = habit.name
    setSelectedSimHabits((prev) => {
      if (prev.includes(habitName)) {
        const next = prev.filter((n) => n !== habitName)
        return next
      }
      return [...prev, habitName]
    })

    if (!selectedSet.has(habitName)) {
      const defaultTarget = Math.max(0, Math.min(7, habit.defaultWeeklyTarget))
      setTargetsByHabit((prev) => ({ ...prev, [habitName]: defaultTarget }))
      setAchievedByHabit((prev) => ({ ...prev, [habitName]: defaultTarget }))
    } else {
      setTargetsByHabit((prev) => {
        const next = { ...prev }
        delete next[habitName]
        return next
      })
      setAchievedByHabit((prev) => {
        const next = { ...prev }
        delete next[habitName]
        return next
      })
    }
  }

  const clamp0to7 = (n) => Math.max(0, Math.min(7, Math.round(Number(n) || 0)))

  const handleScenarioUnlock = (e) => {
    e.preventDefault()
    if (scenarioPassword === 'TXTT1337') {
      setScenarioUnlocked(true)
      setScenarioError('')
    } else {
      setScenarioUnlocked(false)
      setScenarioError('Incorrect password.')
    }
  }

  const applySimulation = () => {
    if (selectedSimHabits.length === 0) return
    onApplySimulation?.({
      months: simulationMonths,
      selectedHabits: selectedSimHabits,
      targetsByHabit,
      achievedByHabit,
    })
  }

  const applyPreset = (preset) => {
    setSimulationMonths(preset.months)
    setSelectedSimHabits(preset.selectedHabits)
    setTargetsByHabit(preset.targetsByHabit ?? {})
    setAchievedByHabit(preset.achievedByHabit ?? {})

    onApplySimulation?.({
      months: preset.months,
      selectedHabits: preset.selectedHabits,
      targetsByHabit: preset.targetsByHabit ?? {},
      achievedByHabit: preset.achievedByHabit ?? {},
      forcePerfect: preset.forcePerfect ?? false,
    })
  }

  // Rank override (overall helmet only)
  const [tier, setTier] = useState('Gold')
  const [division, setDivision] = useState('II')
  const [testLp, setTestLp] = useState(42)

  const handleApplyRank = () => {
    const payload = buildTestRankPayload(tier, division, testLp)
    onApplyTestRank?.(payload)
  }

  const challengerNoDivision = tier === 'Challenger'

  const displayUsername =
    profile && typeof profile.username === 'string' && profile.username.trim() !== '' ? profile.username : null

  return (
    <div className="screen settings">
      <header className="settings-page-head">
        <h1>Settings</h1>
        <p className="settings-subtitle">Configure your app preferences.</p>
      </header>

      <div className="settings-primary-stack">
        <section className="settings-section settings-section-rank">
          <h2 className="settings-section-title">Rank display</h2>
          <label className="settings-test-row">
            <span>Rank visuals</span>
            <select
              className="settings-test-input"
              value={rankVisualTheme}
              onChange={(e) =>
                onRankVisualThemeChange?.(e.target.value === 'valorant' ? 'valorant' : 'lol')
              }
            >
              <option value="lol">League of Legends</option>
              <option value="valorant">Valorant</option>
            </select>
          </label>
        </section>

        <FriendsPanel />

        <section className="settings-section settings-section-account">
          <h2 className="settings-section-title">Account</h2>
          {!isConfigured ? (
            <div className="settings-account-row settings-account-row--muted">
              <CloudOff size={16} strokeWidth={2} aria-hidden />
              <span>Sign-in unavailable (configure Supabase).</span>
            </div>
          ) : authLoading ? (
            <div className="settings-account-row">
              <Loader2 size={18} strokeWidth={2} className="settings-account-spin" aria-hidden />
              <span>Loading session…</span>
            </div>
          ) : !user ? (
            <button type="button" className="settings-account-btn settings-account-btn--primary" onClick={() => signInWithGoogle()}>
              <LogIn size={16} strokeWidth={2} aria-hidden />
              <span>Continue with Google</span>
            </button>
          ) : (
            <div className="settings-account-block">
              <div className="settings-account-field">
                <span className="settings-account-label">Email</span>
                <span className="settings-account-value" title={user.email ?? ''}>
                  {user.email ?? '—'}
                </span>
              </div>
              <div className="settings-account-field">
                <span className="settings-account-label">Username</span>
                {profileStatus === 'loading' ? (
                  <span className="settings-account-row">
                    <Loader2 size={16} strokeWidth={2} className="settings-account-spin" aria-hidden />
                    Loading…
                  </span>
                ) : (
                  <span className="settings-account-value">{displayUsername ?? 'Not set'}</span>
                )}
              </div>
              {profileLoadError ? (
                <div className="settings-account-alert">
                  <AlertCircle size={16} strokeWidth={2} aria-hidden />
                  <span>{profileLoadError}</span>
                  <button type="button" className="settings-account-link" onClick={() => void refreshProfile()}>
                    Retry
                  </button>
                </div>
              ) : null}
              <div className="settings-account-row settings-account-sync">
                <Cloud size={16} strokeWidth={2} aria-hidden />
                <span className={cloudStatus === 'error' ? 'settings-account-sync--error' : ''}>
                  {cloudStatusLabel(cloudStatus)}
                </span>
                {lastCloudError ? (
                  <span className="settings-account-sync-error" title={lastCloudError}>
                    ⚠
                  </span>
                ) : null}
              </div>
              <div className="settings-account-actions">
                <button type="button" className="settings-account-btn" onClick={() => setUsernameEditOpen(true)} disabled={profileStatus === 'loading'}>
                  Change username
                </button>
                <button type="button" className="settings-account-btn" onClick={() => void handleSignOut()}>
                  <LogOut size={16} strokeWidth={2} aria-hidden />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </section>

        <UsernameModal
          open={usernameEditOpen}
          title="Change username"
          initialValue={displayUsername ?? ''}
          submitLabel="Save"
          forceOpen={false}
          onSubmit={handleSaveUsernameEdit}
          onClose={() => setUsernameEditOpen(false)}
        />
      </div>

      <section className="settings-section settings-section-data">
        <h2 className="settings-section-title">Data</h2>
        <button type="button" className="settings-reset-btn" onClick={() => onResetAllProgress?.()}>
          Reset app data
        </button>
      </section>

      <section className="settings-section settings-section-test settings-section-dev">
        <h2 className="settings-section-title">Simulation tools (temporary)</h2>
        <p className="settings-test-note">
          Build a realistic completion history, then instantly preview per-habit ranks, overall rank, and
          stats. Temporary/internal only.
        </p>

        {!scenarioUnlocked && (
          <div className="settings-test-block">
            <h3 className="settings-test-heading">Scenario access</h3>
            <form className="settings-scenario-unlock-form" onSubmit={handleScenarioUnlock}>
              <label className="settings-test-row">
                <span>Password</span>
                <input
                  className="settings-test-input"
                  type="password"
                  value={scenarioPassword}
                  onChange={(e) => setScenarioPassword(e.target.value)}
                />
              </label>
              <button type="submit" className="settings-test-btn settings-scenario-unlock-btn">
                Unlock scenarios
              </button>
            </form>
            {scenarioError ? <p className="settings-test-hint settings-test-error">{scenarioError}</p> : null}
          </div>
        )}

        {scenarioUnlocked && (
          <>
            <div className="settings-test-block">
              <h3 className="settings-test-heading">Preset scenarios</h3>
              <div className="settings-test-preset-row">
                {SIM_PRESET_SCENARIOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="settings-test-chip"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-test-block">
              <h3 className="settings-test-heading">Time period</h3>
              <label className="settings-test-row">
                <span>Months of history</span>
                <select
                  className="settings-test-input"
                  value={simulationMonths}
                  onChange={(e) => setSimulationMonths(Number(e.target.value))}
                >
                  {SIM_MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="settings-test-block">
              <h3 className="settings-test-heading">Habit picker</h3>
              <div className="settings-sim-habit-picker">
                {habits.map((h) => {
                  const checked = selectedSet.has(h.name)
                  return (
                    <label key={h.name} className="settings-sim-habit-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSimHabit(h)}
                      />
                      <span>{h.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {selectedHabitList.length > 0 ? (
              <div className="settings-test-block">
                <h3 className="settings-test-heading">Targets + achieved per week</h3>
                <p className="settings-test-hint">
                  Achieved days generate completions. Targets are stored as selected target days (rank/LP uses
                  the selected target count). Setting target to 0 effectively falls back to the habit default
                  target due to the existing rank logic.
                </p>
                <div className="settings-sim-habit-controls">
                  {selectedHabitList.map((h) => (
                    <div key={h.name} className="settings-sim-habit-control">
                      <div className="settings-sim-habit-control-title">{h.name}</div>
                      <div className="settings-sim-input-row">
                        <label className="settings-sim-mini-field">
                          <span>Target (0–7)</span>
                          <input
                            className="settings-test-input settings-sim-number"
                            type="number"
                            min={0}
                            max={7}
                            value={targetsByHabit[h.name] ?? clamp0to7(h.defaultWeeklyTarget)}
                            onChange={(e) =>
                              setTargetsByHabit((prev) => ({
                                ...prev,
                                [h.name]: clamp0to7(e.target.value),
                              }))
                            }
                          />
                        </label>
                        <label className="settings-sim-mini-field">
                          <span>Achieved (0–7)</span>
                          <input
                            className="settings-test-input settings-sim-number"
                            type="number"
                            min={0}
                            max={7}
                            value={achievedByHabit[h.name] ?? clamp0to7(h.defaultWeeklyTarget)}
                            onChange={(e) =>
                              setAchievedByHabit((prev) => ({
                                ...prev,
                                [h.name]: clamp0to7(e.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="settings-test-btn" onClick={applySimulation}>
                  Apply simulation
                </button>
              </div>
            ) : (
              <div className="settings-test-block">
                <p className="settings-test-hint">Select one or more habits to start.</p>
              </div>
            )}
          </>
        )}
      </section>

      {scenarioUnlocked && (
        <section className="settings-section settings-section-test settings-section-dev">
          <h2 className="settings-section-title">Rank override (temporary)</h2>
          <div className="settings-test-block">
            <h3 className="settings-test-heading">Set rank manually (overall only)</h3>
            <label className="settings-test-row">
              <span>Tier</span>
              <select
                className="settings-test-input"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                {TEST_TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {challengerNoDivision ? (
              <p className="settings-test-hint">Challenger is a single tier (no division).</p>
            ) : (
              <label className="settings-test-row">
                <span>Division</span>
                <select
                  className="settings-test-input"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                >
                  {TEST_DIVISION_ROMAN.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="settings-test-row">
              <span>LP (0–100)</span>
              <input
                className="settings-test-input"
                type="number"
                min={0}
                max={100}
                value={testLp}
                onChange={(e) => setTestLp(Number(e.target.value))}
              />
            </label>
            <button type="button" className="settings-test-btn" onClick={handleApplyRank}>
              Apply test rank
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

export default Settings
