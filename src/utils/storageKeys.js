/** Central localStorage keys for the habit tracker */
export const STORAGE_COMPLETIONS = 'habit-tracker-completions'
export const STORAGE_TARGET_DAYS = 'habit-tracker-target-days'
export const STORAGE_ACTIVE_HABITS = 'habit-tracker-active-habits'
/** Per-habit segments: effectiveFrom, isActive, targetDays — used for historical rank weeks. */
export const STORAGE_HABIT_CONFIG_HISTORY = 'habit-tracker-habit-config-history'
export const STORAGE_QUANTITY_SETTINGS = 'habit-tracker-quantity-settings'
export const STORAGE_RANKS_LEGACY = 'habit-tracker-ranks'

/** Rank screen visual theme: `lol` | `valorant` (display-only; ladder unchanged). */
export const STORAGE_RANK_VISUAL_THEME = 'habit-tracker-rank-visual-theme'

/** Dev/testing (temporary) */
export const STORAGE_TEST_RANK_OVERRIDE = 'habit-tracker-test-rank-override'
export const STORAGE_TEST_TIME_OFFSET_MONTHS = 'habit-tracker-test-time-offset-months'
