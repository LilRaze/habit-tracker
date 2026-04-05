import { habits } from '../../../src/data/habits.js'
import { getStatKeysForHabit } from '../../../src/data/habitStatMapping.js'

const allNames = habits.map((h) => h.name)
const mappedNames = allNames.filter((n) => getStatKeysForHabit(n).length > 0)
const unmappedNames = allNames.filter((n) => getStatKeysForHabit(n).length === 0)

/** 100 deterministic habit/target profiles (active habits + optional target day overrides). */
export function buildHabitProfiles() {
  const profiles = []

  const push = (id, label, activeHabits, targetDaysByHabit = null) => {
    profiles.push({
      id,
      label,
      activeHabits,
      targetDaysByHabit: targetDaysByHabit ?? undefined,
    })
  }

  // 0–9: size & composition
  push('P00', 'Single mapped habit', ['Gym'])
  push('P01', 'Two mapped (cross-category)', ['Gym', 'Read book'])
  push('P02', 'Three mapped balanced', ['Gym', 'Sleep', 'Study'])
  push('P03', 'Four mapped', ['Gym', 'Running', 'Sleep', 'Read book'])
  push('P04', 'Five mapped', ['Gym', 'Sleep', 'Study', 'Meditation', 'Clean room'])
  push('P05', 'Six mapped', mappedNames.slice(0, 6))
  push('P06', 'Eight mapped broad', mappedNames.slice(0, 8))
  push('P07', 'Ten mapped broad', mappedNames.slice(0, 10))
  push('P08', 'Twelve mapped', mappedNames.slice(0, 12))
  push('P09', 'Fifteen mapped (max breadth)', mappedNames.slice(0, 15))

  // 10–19: target shape
  push('P10', 'Weekday-only targets (Mon–Fri)', ['Gym', 'Sleep', 'Study'], {
    Gym: [0, 1, 2, 3, 4],
    Sleep: [0, 1, 2, 3, 4],
    Study: [0, 1, 2, 3, 4],
  })
  push('P11', 'Weekend-only targets', ['Gym', 'Read book'], {
    Gym: [5, 6],
    'Read book': [5, 6],
  })
  push('P12', 'Narrow targets (2 days/week)', ['Clean room', 'Laundry'], {
    'Clean room': [0, 3],
    Laundry: [2, 5],
  })
  push('P13', 'Single-day micro target', ['Meet someone new'])
  push('P14', 'High weekly targets (7-day)', ['No junk food', 'Sleep', 'Shower'])
  push('P15', 'Mixed 3/5/7 targets', ['Gym', 'Read book', 'No junk food'])
  push('P16', 'Intelligence-heavy set', ['Study', 'Read book', 'Language learning', 'Work on skill'])
  push('P17', 'Strength/health-heavy set', ['Gym', 'Running', 'Walk goal', 'Sports'])
  push('P18', 'Discipline-heavy set', ['Laundry', 'Clean room', 'Cold shower', 'No phone'])
  push('P19', 'Health routine set', ['Sleep', 'Shower', 'Dental care', 'No alcohol', 'No junk food'])

  // 20–29: unmapped & mixed
  push('P20', 'Unmapped trio only', unmappedNames.slice(0, 3))
  push('P21', 'Unmapped + one mapped', [...unmappedNames.slice(0, 2), 'Gym'])
  push('P22', 'Mostly unmapped', [...unmappedNames, 'Gym'].slice(0, 5))
  push('P23', 'Mapped majority + unmapped', [...mappedNames.slice(0, 6), ...unmappedNames])
  push('P24', 'Edge: one low-target mapped', ['Meet someone new', 'Help someone'])
  push('P25', 'Edge: high-volume low-target', ['Meet someone new', 'Gym', 'Sleep'])
  push('P26', 'Symmetry: 4 habits same default target', ['Gym', 'Running', 'Sports', 'Cold shower'])
  push('P27', 'Odd mix: walk + study + dental', ['Walk goal', 'Study', 'Dental care'])
  push('P28', 'Social/relational mapped', ['Help someone', 'Spend time with family', 'Meet someone new'])
  push('P29', 'Reflection stack', ['Reflection', 'Journaling', 'Meditation'])

  // 30–39: stress / edge compositions
  push('P30', 'Minimum viable (1 habit)', ['Sleep'])
  push('P31', 'Duplicate categories Gym+Running', ['Gym', 'Running'])
  push('P32', 'All double-map pairs subset', ['Gym', 'Sleep', 'Study'])
  push('P33', 'Clean room only (single habit)', ['Clean room'])
  push('P34', 'Read + language + skill', ['Read book', 'Language learning', 'Work on skill'])
  push('P35', 'Household trio', ['Clean room', 'Laundry', 'Cold shower'])
  push('P36', 'Seven habits mid-size', mappedNames.slice(4, 11))
  push('P37', 'Twenty mapped (stress)', mappedNames.slice(0, 20))
  push('P38', 'Alternating id names from catalog', [
    habits[0].name,
    habits[3].name,
    habits[7].name,
    habits[11].name,
  ])
  push('P39', 'Full mapped catalog slice 10–25', mappedNames.slice(10, 25))

  // 40–99: systematic variations (indices into mappedNames)
  const seeds = [
    [0, 2, 5],
    [1, 4, 7, 9],
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16],
    [0, 5, 10, 15],
    [2, 8, 14, 20],
    [1, 3, 5, 7, 9, 11],
    [4, 8, 12, 16],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [10, 11, 12, 13],
    [14, 15, 16, 17, 18],
    [19, 20, 21],
    [0, 4, 8, 12, 16, 20],
    [1, 5, 9, 13],
    [2, 6, 10, 14, 18],
    [3, 7, 11, 15],
    [0, 10, 20],
    [5, 15, 25],
    [0, 2, 4, 6, 8, 10, 12],
    [1, 3, 5, 7, 9],
    [12, 13, 14, 15],
    [16, 17, 18, 19, 20],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [20, 21, 22, 23],
    [0, 3, 6, 9, 12],
    [2, 5, 8, 11],
    [4, 7, 10, 13, 16],
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [0, 5, 10, 15, 20],
    [2, 4, 6, 8],
    [1, 6, 11, 16],
    [3, 8, 13, 18],
    [0, 7, 14],
    [2, 9, 16, 23],
    [4, 11, 18],
    [1, 4, 7, 10, 13],
    [0, 2, 4, 6, 8, 10],
    [5, 10, 15, 20, 25],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    [3, 6, 9, 12, 15, 18],
    [1, 8, 15],
    [2, 5, 8, 11, 14],
    [0, 4, 8, 12, 16, 20, 24],
    [6, 12, 18],
    [1, 3, 5, 7, 9, 11, 13],
    [0, 6, 12, 18, 24],
    [2, 7, 12, 17],
    [4, 9, 14, 19, 24],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    [5, 6, 7, 8, 9],
    [10, 12, 14, 16],
    [0, 3, 7, 11, 15],
    [2, 6, 10, 14, 18, 22],
    [1, 4, 9, 14],
    [0, 5, 9, 14, 19],
    [3, 8, 13, 18, 23],
    [1, 2, 3, 4, 5, 6],
    [11, 13, 15, 17],
    [0, 8, 16],
    [4, 8, 12],
    [2, 4, 6, 8, 10, 12],
    [1, 5, 9, 13, 17],
    [0, 2, 5, 7, 9],
    [3, 6, 9, 12, 15, 18],
  ]

  for (let i = 0; i < seeds.length; i += 1) {
    const idx = 40 + i
    const pick = seeds[i]
      .map((j) => mappedNames[j])
      .filter(Boolean)
    const unique = [...new Set(pick)]
    if (unique.length === 0) unique.push('Gym')
    push(
      `P${String(idx).padStart(2, '0')}`,
      `Generated mix #${i} (${unique.length} habits)`,
      unique
    )
  }

  while (profiles.length < 100) {
    const i = profiles.length
    const start = (i * 3) % mappedNames.length
    const slice = mappedNames.slice(start, start + 5)
    push(`P${String(i).padStart(2, '0')}`, `Pad ${i}`, slice.length ? slice : ['Gym'])
  }

  return profiles.slice(0, 100)
}

export const HABIT_PROFILES = buildHabitProfiles()

export { mappedNames, unmappedNames, allNames }
