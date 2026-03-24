export const CORE_STATS = ['strength', 'health', 'intelligence', 'discipline']

/**
 * Habit influence weights per stat.
 * Higher values mean a habit contributes more strongly to that stat over time.
 */
export const HABIT_STAT_WEIGHTS = {
  Gym: { strength: 10, health: 6, discipline: 5 },
  Running: { health: 10, discipline: 5, strength: 2 },
  'Walk goal': { health: 8, discipline: 6 },
  Sports: { health: 8, strength: 6, discipline: 4 },
  'No junk food': { health: 9, discipline: 8 },
  Sleep: { health: 10, discipline: 6, intelligence: 4 },
  'No alcohol': { health: 9, discipline: 8 },
  'No fap': { discipline: 8, health: 4 },
  'Read book': { intelligence: 10, discipline: 6 },
  'Work on skill': { intelligence: 8, discipline: 8 },
  Study: { intelligence: 10, discipline: 7 },
  'Language learning': { intelligence: 10, discipline: 6 },
  'Clean room': { discipline: 8, health: 3 },
  Laundry: { discipline: 7, health: 2 },
  'Tooth pick use': { health: 8, discipline: 5 },
  'Dental care': { health: 9, discipline: 6 },
  Shower: { health: 8, discipline: 4 },
  Meditation: { intelligence: 5, discipline: 8, health: 5 },
  Journaling: { intelligence: 6, discipline: 7, health: 3 },
  'No phone': { discipline: 9, intelligence: 5, health: 2 },
  Reflection: { intelligence: 7, discipline: 6 },
  'Gratitude practice': { health: 5, intelligence: 4, discipline: 6 },
  'No social media day': { discipline: 9, intelligence: 5 },
  'Cold shower': { discipline: 8, health: 6 },
  'Help someone': { health: 4, discipline: 5, intelligence: 3 },
  'Spend time with family': { health: 6, discipline: 4, intelligence: 2 },
  'Meet someone new': { health: 4, intelligence: 4, discipline: 3 },
}

/**
 * Calibration constants for slow long-term progression.
 * Keep these centralized so pacing can be tuned later without UI changes.
 */
export const STATS_CALIBRATION = {
  weeklyBaseGain: 0.06,
  maxOverTargetCredit: 1.2,
}
