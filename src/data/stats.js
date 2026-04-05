export const CORE_STATS = ['strength', 'health', 'intelligence', 'discipline']

// Internal stats range (progression scale).
export const STATS_MAX = 5000

// Diminishing returns curve constant (higher K => slower display growth for the same raw).
// Display-only tuning: lower K makes early/mid Overall % more legible without changing raw totals.
// K=1800: balanced display lift vs long-horizon headroom (calibration sweet spot vs very low K).
export const STATS_CURVE_K = 1800
