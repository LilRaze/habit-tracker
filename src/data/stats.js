export const CORE_STATS = ['strength', 'health', 'intelligence', 'discipline']

// Internal stats range (progression scale).
export const STATS_MAX = 5000

// Diminishing returns curve constant (higher K => slower growth).
//  - raw=K   => ~63% of STATS_MAX
//  - raw≈2.3K => ~90% of STATS_MAX
export const STATS_CURVE_K = 4000
