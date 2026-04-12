// Central mapping: habit name -> which stat(s) each completion increments.
//
// Rule: no per-habit weights. Each completion contributes equally:
// - if a habit maps to 1 stat: +1 raw point to that stat
// - if a habit maps to 2 stats: +1 raw point to each mapped stat

export const HABIT_TO_STAT_KEYS = {
  // Strength + Health
  Gym: ['strength', 'health'],
  Running: ['strength', 'health'],
  'Walk goal': ['strength', 'health'],
  Sports: ['strength', 'health'],

  // Health + Discipline
  'No junk food': ['health', 'discipline'],
  Sleep: ['health', 'discipline'],
  'No alcohol': ['health', 'discipline'],
  Shower: ['health', 'discipline'],
  'Dental care': ['health', 'discipline'],
  'Tooth pick use': ['health', 'discipline'],

  // Discipline + Health
  'Cold shower': ['discipline', 'health'],
  'Clean room': ['discipline', 'health'],
  Laundry: ['discipline', 'health'],

  // Intelligence + Discipline
  Study: ['intelligence', 'discipline'],
  'Work on skill': ['intelligence', 'discipline'],
  'Language learning': ['intelligence', 'discipline'],
  'Read book': ['intelligence', 'discipline'],
  Meditation: ['intelligence', 'discipline'],
  Journaling: ['intelligence', 'discipline'],
  Reflection: ['intelligence', 'discipline'],
  'Gratitude practice': ['intelligence', 'discipline'],
  'No phone': ['intelligence', 'discipline'],
  'No social media': ['intelligence', 'discipline'],
  'Help someone': ['intelligence', 'discipline'],
  'Spend time with family': ['intelligence', 'discipline'],
  'Meet someone new': ['intelligence', 'discipline'],
}

export function getStatKeysForHabit(habitName) {
  return HABIT_TO_STAT_KEYS[habitName] ?? []
}

