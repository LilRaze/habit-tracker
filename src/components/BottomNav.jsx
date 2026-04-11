import { BarChart3, Target, PlusCircle, Trophy, Users, Settings } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', Icon: BarChart3 },
  { id: 'targets', label: 'Targets', Icon: Target },
  { id: 'log', label: 'Log', Icon: PlusCircle },
  { id: 'rank', label: 'Rank', Icon: Trophy },
  { id: 'social', label: 'Social', Icon: Users },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="nav-icon">
            <tab.Icon size={26} strokeWidth={2} />
          </span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
