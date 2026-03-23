import { HeartPulse, Dumbbell, Brain, ShieldCheck } from 'lucide-react'

const MAIN_CATEGORIES = ['Health', 'Strength', 'Intelligence', 'Discipline']
const ICONS = [HeartPulse, Dumbbell, Brain, ShieldCheck]

const PADDING = 28
const SIZE = 220
const CENTER = SIZE / 2 + PADDING
const RADIUS = 105
const VIEW_SIZE = SIZE + PADDING * 2
const VIEW_PADDING = 16

function getPoint(score, index) {
  const angle = (index * 90 - 90) * (Math.PI / 180)
  const r = (score / 100) * RADIUS
  const x = CENTER + r * Math.cos(angle)
  const y = CENTER + r * Math.sin(angle)
  return { x, y }
}

function getLabelPoint(index) {
  const angle = (index * 90 - 90) * (Math.PI / 180)
  const r = RADIUS + 28
  const x = CENTER + r * Math.cos(angle)
  const y = CENTER + r * Math.sin(angle)
  return { x, y }
}

function RadarChart({ scores }) {
  const points = MAIN_CATEGORIES.map((cat, i) => getPoint(scores[cat] ?? 0, i))
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const totalSize = VIEW_SIZE + VIEW_PADDING * 2

  return (
    <div className="radar-chart">
      <svg
        viewBox={`-${VIEW_PADDING} -${VIEW_PADDING} ${totalSize} ${totalSize}`}
        className="radar-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        {[25, 50, 75, 100].map((pct) => (
          <circle
            key={pct}
            cx={CENTER}
            cy={CENTER}
            r={(pct / 100) * RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeOpacity="0.5"
            strokeWidth="0.5"
          />
        ))}
        {MAIN_CATEGORIES.map((_, i) => {
          const p = getPoint(100, i)
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="var(--border)"
              strokeOpacity="0.5"
              strokeWidth="0.5"
            />
          )
        })}
        <polygon
          points={polygonPoints}
          fill="url(#radarFill)"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {MAIN_CATEGORIES.map((cat, i) => {
          const p = getLabelPoint(i)
          const Icon = ICONS[i]
          const iconSize = 30
          const offset = iconSize / 2
          return (
            <foreignObject
              key={cat}
              x={p.x - offset}
              y={p.y - offset}
              width={iconSize}
              height={iconSize}
              className="radar-icon-wrapper"
            >
              <div xmlns="http://www.w3.org/1999/xhtml" className="radar-icon">
                <Icon size={iconSize} strokeWidth={2} />
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}

export default RadarChart
