import { useLayoutEffect, useRef } from 'react'
import { habits } from '../data/habits'
import {
  Activity,
  BedDouble,
  BookOpen,
  Brain,
  Briefcase,
  Dumbbell,
  Droplets,
  Flower2,
  Footprints,
  GlassWater,
  HandHelping,
  Home,
  Languages,
  Martini,
  MessageCircleHeart,
  PersonStanding,
  Shirt,
  Smile,
  Smartphone,
  Snowflake,
  Sparkles,
  StretchHorizontal,
  Users,
  UtensilsCrossed,
  UserRoundPlus,
} from 'lucide-react'
import './Targets.css'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const BUBBLE_META = {
  Gym: { label: 'Gym', Icon: Dumbbell },
  Running: { label: 'Run', Icon: Activity },
  'Walk goal': { label: 'Walk', Icon: Footprints },
  Sports: { label: 'Sports', Icon: PersonStanding },
  'No junk food': { label: 'No junk food', Icon: UtensilsCrossed },
  Sleep: { label: 'Sleep', Icon: BedDouble },
  'No alcohol': { label: 'No alcohol', Icon: Martini },
  'Read book': { label: 'Reading', Icon: BookOpen },
  'Work on skill': { label: 'Skill', Icon: Briefcase },
  Study: { label: 'Study', Icon: Brain },
  'Language learning': { label: 'Language learning', Icon: Languages },
  'Clean room': { label: 'Clean room', Icon: Home },
  Laundry: { label: 'Laundry', Icon: Shirt },
  'Tooth pick use': { label: 'Floss / toothpick', Icon: Sparkles },
  'Dental care': { label: 'Dental care', Icon: Smile },
  Shower: { label: 'Shower', Icon: Droplets },
  Meditation: { label: 'Meditate', Icon: Flower2 },
  Journaling: { label: 'Journal', Icon: BookOpen },
  'No phone': { label: 'No phone', Icon: Smartphone },
  Reflection: { label: 'Reflect', Icon: StretchHorizontal },
  'Gratitude practice': { label: 'Gratitude', Icon: MessageCircleHeart },
  'No social media': { label: 'No social media', Icon: GlassWater },
  'Cold shower': { label: 'Cold shower', Icon: Snowflake },
  'Help someone': { label: 'Help someone', Icon: HandHelping },
  'Spend time with family': { label: 'Family time', Icon: Users },
  'Meet someone new': { label: 'Meet people', Icon: UserRoundPlus },
}

function getHabitDisplayMeta(habitName) {
  return BUBBLE_META[habitName] ?? { label: habitName, Icon: Sparkles }
}

function Targets({
  activeHabits,
  onToggleActiveHabit,
  targetDays,
  onToggleTargetDay,
  quantitySettings,
  onUpdateQuantitySetting,
}) {
  const data = targetDays ?? {}
  const activeSet = new Set(activeHabits ?? [])
  const quantities = quantitySettings ?? {}
  const activeHabitList = habits.filter((habit) => activeSet.has(habit.name))
  const inactiveHabitList = habits.filter((habit) => !activeSet.has(habit.name))

  const prevActiveRef = useRef(activeHabits)

  useLayoutEffect(() => {
    const prev = prevActiveRef.current ?? []
    const curr = activeHabits ?? []
    prevActiveRef.current = curr
    if (!Array.isArray(prev) || !Array.isArray(curr) || curr.length <= prev.length) return
    const prevSet = new Set(prev)
    const added = curr.filter((name) => !prevSet.has(name))
    const lastAdded = added.length ? added[added.length - 1] : null
    if (!lastAdded) return
    const habitMeta = habits.find((h) => h.name === lastAdded)
    const anchorId = habitMeta ? `targets-habit-card-${habitMeta.id}` : null
    const el = anchorId ? document.getElementById(anchorId) : null
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeHabits])

  return (
    <div className="screen targets">
      <h1>Habits</h1>

      <div className="targets-habit-cards">
        {activeHabitList.map((habit) => {
          const selectedDays = data[habit.name] ?? []
          const targetCount = selectedDays.length
          const quantityValue = quantities[habit.name] ?? ''
          const meta = getHabitDisplayMeta(habit.name)
          const Icon = meta.Icon

          return (
            <div key={habit.name} id={`targets-habit-card-${habit.id}`} className="targets-habit-card">
              <div className="targets-habit-header">
                <h3 className="targets-habit-name">
                  <Icon size={16} strokeWidth={2} className="targets-habit-icon" />
                  <span>{meta.label}</span>
                </h3>
                <button
                  type="button"
                  className="targets-activate-btn"
                  onClick={() => onToggleActiveHabit?.(habit.name)}
                  aria-label={`Deactivate ${habit.name}`}
                >
                  Remove
                </button>
              </div>
              <div className="targets-day-squares">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const isSelected = selectedDays.includes(dayIndex)
                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      className={`targets-day-square ${isSelected ? 'active' : ''}`}
                      onClick={() => onToggleTargetDay?.(habit.name, dayIndex)}
                      aria-label={`${habit.name} ${WEEKDAY_LABELS[dayIndex]} ${isSelected ? 'selected' : 'not selected'}`}
                    >
                      {WEEKDAY_LABELS[dayIndex]}
                    </button>
                  )
                })}
              </div>
              <span className="targets-target-count">{targetCount} days per week</span>

              {habit.hasQuantity ? (
                <div className="targets-quantity-row">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="targets-quantity-input"
                    value={quantityValue}
                    onChange={(e) => onUpdateQuantitySetting?.(habit.name, e.target.value)}
                    placeholder={habit.quantityPlaceholder ?? ''}
                    aria-label={`${habit.name} quantity${habit.quantityLabel ? ` (${habit.quantityLabel})` : ''}`}
                  />
                  <span className="targets-quantity-label">{habit.quantityLabel}</span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {inactiveHabitList.length > 0 ? (
        <section className="targets-picker">
          <div className="targets-picker-bubbles">
            {inactiveHabitList.map((habit) => {
              const meta = getHabitDisplayMeta(habit.name)
              const Icon = meta.Icon
              return (
                <button
                  key={habit.name}
                  type="button"
                  className="targets-bubble"
                  onClick={() => onToggleActiveHabit?.(habit.name)}
                >
                  <Icon size={14} strokeWidth={2} className="targets-bubble-icon" />
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default Targets
