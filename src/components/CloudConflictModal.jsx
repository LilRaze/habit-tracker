import './CloudConflictModal.css'

export default function CloudConflictModal({ onUseCloud, onUseDevice }) {
  return (
    <div className="cloud-conflict-overlay" role="dialog" aria-modal="true" aria-labelledby="cloud-conflict-title">
      <div className="cloud-conflict-card">
        <h2 id="cloud-conflict-title" className="cloud-conflict-title">
          Account and device differ
        </h2>
        <p className="cloud-conflict-lead">Pick one. The other copy is discarded for this account.</p>
        <div className="cloud-conflict-actions">
          <button type="button" className="cloud-conflict-btn cloud-conflict-btn--primary" onClick={onUseCloud}>
            <span className="cloud-conflict-btn-label">Use account (recommended)</span>
            <span className="cloud-conflict-btn-detail">
              Load what’s saved for this account. Replaces habit data on this device only.
            </span>
          </button>
          <button type="button" className="cloud-conflict-btn cloud-conflict-btn--danger" onClick={onUseDevice}>
            <span className="cloud-conflict-btn-label">Use this device — overwrites cloud</span>
            <span className="cloud-conflict-btn-detail">
              Uploads this device’s habit data and replaces the account copy. Other devices will see this version
              next sync.
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
