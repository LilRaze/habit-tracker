import './Settings.css'

function Settings({ onResetAllProgress }) {
  const handleReset = () => {
    onResetAllProgress?.()
  }

  return (
    <div className="screen settings">
      <h1>Settings</h1>
      <p className="settings-subtitle">Configure your app preferences.</p>

      <section className="settings-section">
        <h2 className="settings-section-title">Data</h2>
        <button
          type="button"
          className="settings-reset-btn"
          onClick={handleReset}
        >
          Reset all progress
        </button>
      </section>
    </div>
  )
}

export default Settings
