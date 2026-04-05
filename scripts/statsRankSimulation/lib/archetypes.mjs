/**
 * 50 behavior archetypes. Each exposes computeRatio(ctx) -> number (scaled vs target days).
 * ctx: { weekIndex, totalWeeks, habitIndex, habitName, habit, rng, profile, targetLen, pool, weekMonday }
 * modifiers optional: { currentWeekOnly, overachiever, longBreak, selectiveFocus, boomBust, ... }
 */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)

export const ARCHETYPES = [
  { id: 'A01', name: 'Very consistent high performer', computeRatio: () => 1 },
  { id: 'A02', name: 'Consistent modest performer', computeRatio: () => 0.78 },
  { id: 'A03', name: 'Slightly under target', computeRatio: () => 0.88 },
  { id: 'A04', name: 'Far under target', computeRatio: () => 0.38 },
  { id: 'A05', name: 'Overachiever (extra completion days)', modifiers: { overachiever: true }, computeRatio: () => 1.15 },
  { id: 'A06', name: 'Strong start then decline', computeRatio: (ctx) => {
      const t = ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1)
      return 1 - 0.45 * t
    } },
  { id: 'A07', name: 'Weak start then improve', computeRatio: (ctx) => {
      const t = ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1)
      return 0.35 + 0.6 * t
    } },
  { id: 'A08', name: 'Streaky / bursty', computeRatio: (ctx) => (ctx.weekIndex % 3 === 0 ? 1 : 0.45) },
  { id: 'A09', name: 'Boom–bust cycles', modifiers: { boomBust: true }, computeRatio: () => 0.85 },
  { id: 'A10', name: 'Weekday-heavy (profile pool)', computeRatio: () => 0.95 },
  { id: 'A11', name: 'Weekend-heavy (profile pool)', computeRatio: () => 0.9 },
  { id: 'A12', name: 'Long break after early momentum', modifiers: { longBreak: true }, computeRatio: (ctx) => {
      if (ctx.weekIndex >= 20 && ctx.weekIndex < 40) return 0
      return 0.85
    } },
  { id: 'A13', name: 'Selective focus (few habits)', modifiers: { selectiveFocus: true }, computeRatio: (ctx) => (ctx.habitIndex < 2 ? 0.95 : 0.08) },
  { id: 'A14', name: 'Many habits mediocre adherence', computeRatio: (ctx) => 0.55 + 0.1 * (ctx.rng() - 0.5) },
  { id: 'A15', name: 'Balanced categories high', computeRatio: () => 0.92 },
  { id: 'A16', name: 'Category-skew (strength/health cluster)', computeRatio: (ctx) => {
      const s = ctx.habitName
      if (['Gym', 'Running', 'Walk goal', 'Sports'].includes(s)) return 0.98
      return 0.35
    } },
  {
    id: 'A17',
    name: 'Unmapped habits only (no stat buckets)',
    computeRatio: (ctx) =>
      ['Tooth pick use', 'Gratitude practice', 'No social media day'].includes(ctx.habitName)
        ? 0.9
        : 0,
  },
  { id: 'A18', name: 'Many active habits sparse completions', computeRatio: (ctx) => 0.12 + 0.05 * ctx.rng() },
  { id: 'A19', name: 'Few active habits excellent attainment', computeRatio: () => 1 },
  { id: 'A20', name: 'Activity concentrated in current week only', modifiers: { currentWeekOnly: true }, computeRatio: () => 1 },
  { id: 'A21', name: 'Barely miss target weekly', computeRatio: () => 0.94 },
  { id: 'A22', name: 'Slightly exceed target weekly', computeRatio: () => 1.06 },
  { id: 'A23', name: 'Noisy random adherence', computeRatio: (ctx) => clamp01(0.35 + ctx.rng() * 0.55) },
  { id: 'A24', name: 'Front-loaded engagement', computeRatio: (ctx) => {
      const early = ctx.totalWeeks * 0.2
      return ctx.weekIndex < early ? 0.98 : 0.42
    } },
  { id: 'A25', name: 'Back-loaded engagement', computeRatio: (ctx) => {
      const late = ctx.totalWeeks * 0.2
      return ctx.weekIndex >= ctx.totalWeeks - late ? 0.98 : 0.4
    } },
  { id: 'A26', name: 'Alternating strong / weak weeks', computeRatio: (ctx) => (ctx.weekIndex % 2 === 0 ? 0.95 : 0.42) },
  { id: 'A27', name: 'Periodic perfect weeks', computeRatio: (ctx) => (ctx.weekIndex % 5 === 0 ? 1 : 0.62) },
  { id: 'A28', name: 'Low-target habit gaming (always hit small targets)', computeRatio: () => 1 },
  { id: 'A29', name: 'High-target struggle', computeRatio: () => 0.48 },
  { id: 'A30', name: 'Single-habit deep focus', modifiers: { selectiveFocus: true }, computeRatio: (ctx) => (ctx.habitIndex === 0 ? 1 : 0.05) },
  { id: 'A31', name: 'Mapped + unmapped mix', computeRatio: (ctx) => (['Tooth pick use', 'Gratitude practice', 'No social media day'].includes(ctx.habitName) ? 0.88 : 0.75) },
  { id: 'A32', name: 'Double-mapped habits emphasized', computeRatio: (ctx) => {
      const dbl = ['Gym', 'Sleep', 'Study'].includes(ctx.habitName)
      return dbl ? 0.96 : 0.5
    } },
  { id: 'A33', name: 'Clean room focus (discipline-heavy)', computeRatio: (ctx) => (ctx.habitName === 'Clean room' ? 0.98 : 0.25) },
  { id: 'A34', name: 'Intelligence cluster focus', computeRatio: (ctx) => (['Study', 'Read book', 'Language learning'].includes(ctx.habitName) ? 0.92 : 0.35) },
  { id: 'A35', name: 'Health cluster focus', computeRatio: (ctx) => (['Sleep', 'Shower', 'No junk food'].includes(ctx.habitName) ? 0.9 : 0.38) },
  { id: 'A36', name: 'Exponential decay of motivation', computeRatio: (ctx) => 0.95 * Math.exp(-ctx.weekIndex / 55) },
  { id: 'A37', name: 'Seasonal sine wave', computeRatio: (ctx) => clamp01(0.55 + 0.4 * Math.sin((ctx.weekIndex / 8) * Math.PI)) },
  { id: 'A38', name: 'Two-week gap mid timeline', computeRatio: (ctx) => {
      const mid = Math.floor(ctx.totalWeeks / 2)
      if (ctx.weekIndex >= mid && ctx.weekIndex < mid + 2) return 0
      return 0.8
    } },
  { id: 'A39', name: 'Same volume different spread (high variance)', computeRatio: (ctx) => (ctx.rng() > 0.5 ? 0.95 : 0.35) },
  { id: 'A40', name: 'Near-perfect with rare misses', computeRatio: (ctx) => (ctx.weekIndex % 11 === 7 ? 0.55 : 0.97) },
  { id: 'A41', name: 'Gradual ramp-up', computeRatio: (ctx) => clamp01(0.4 + 0.55 * (ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1))) },
  { id: 'A42', name: 'Gradual ramp-down', computeRatio: (ctx) => clamp01(0.98 - 0.55 * (ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1))) },
  { id: 'A43', name: 'High variance around 70%', computeRatio: (ctx) => clamp01(0.55 + (ctx.rng() - 0.5) * 0.5) },
  { id: 'A44', name: 'Quarterly reset (bad first month each quarter)', computeRatio: (ctx) => {
      const q = ctx.weekIndex % 13
      return q < 4 ? 0.35 : 0.88
    } },
  { id: 'A45', name: 'Elite plateau after month 1', computeRatio: (ctx) => (ctx.weekIndex < 5 ? 0.75 : 0.98) },
  { id: 'A46', name: 'Chronic underperformer with spikes', computeRatio: (ctx) => (ctx.weekIndex % 9 === 0 ? 0.85 : 0.32) },
  { id: 'A47', name: 'Rank-favorable / stats-neutral (borderline ratios)', computeRatio: () => 0.72 },
  { id: 'A48', name: 'Stats-favorable / rank-moderate (high volume low ratio)', computeRatio: (ctx) => {
      return 0.55 + 0.35 * (ctx.habit?.defaultWeeklyTarget <= 3 ? 1 : 0)
    } },
  { id: 'A49', name: 'Edge: zero completions early, strong late', computeRatio: (ctx) => (ctx.weekIndex < Math.floor(ctx.totalWeeks * 0.3) ? 0 : 0.92) },
  { id: 'A50', name: 'Composite jitter (stress test)', computeRatio: (ctx) => clamp01(0.5 + 0.45 * Math.sin(ctx.weekIndex * 0.7) * ctx.rng()) },
]

export function getArchetypesSubset(count) {
  return ARCHETYPES.slice(0, count)
}
