// scripts/statsCurveCalibration.mjs
import fs from "fs";
import path from "path";

// scripts/statsRankSimulation/installEnv.mjs
var SIM_END = /* @__PURE__ */ new Date("2030-06-06T12:00:00");
var RealDate = globalThis.Date;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(SIM_END.getTime());
    } else {
      super(...args);
    }
  }
  static now() {
    return SIM_END.getTime();
  }
};
var store = /* @__PURE__ */ new Map();
globalThis.localStorage = {
  getItem: (k) => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => {
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  }
};
var SIMULATION_END_DATE_STR = (() => {
  const d = SIM_END;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
})();

// src/data/stats.js
var STATS_MAX = 5e3;
var STATS_CURVE_K = 4e3;

// src/data/habits.js
var habits = [
  {
    id: "gym",
    name: "Gym",
    defaultWeeklyTarget: 3,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "running",
    name: "Running",
    defaultWeeklyTarget: 3,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "walk-goal",
    name: "Walk goal",
    defaultWeeklyTarget: 7,
    hasQuantity: true,
    quantityLabel: "km",
    quantityPlaceholder: null
  },
  {
    id: "sports",
    name: "Sports",
    defaultWeeklyTarget: 3,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "no-junk-food",
    name: "No junk food",
    defaultWeeklyTarget: 7,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "sleep",
    name: "Sleep",
    defaultWeeklyTarget: 7,
    hasQuantity: true,
    quantityLabel: "hours",
    quantityPlaceholder: null
  },
  {
    id: "no-alcohol",
    name: "No alcohol",
    defaultWeeklyTarget: 7,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "read-book",
    name: "Read book",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "work-on-skill",
    name: "Work on skill",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "study",
    name: "Study",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "language-learning",
    name: "Language learning",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "clean-room",
    name: "Clean room",
    defaultWeeklyTarget: 2,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "laundry",
    name: "Laundry",
    defaultWeeklyTarget: 2,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "tooth-pick-use",
    name: "Tooth pick use",
    defaultWeeklyTarget: 7,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "dental-care",
    name: "Dental care",
    defaultWeeklyTarget: 7,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "shower",
    name: "Shower",
    defaultWeeklyTarget: 7,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "meditation",
    name: "Meditation",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "journaling",
    name: "Journaling",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "no-phone",
    name: "No phone",
    defaultWeeklyTarget: 7,
    hasQuantity: true,
    quantityLabel: "hours",
    quantityPlaceholder: null
  },
  {
    id: "reflection",
    name: "Reflection",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "gratitude-practice",
    name: "Gratitude practice",
    defaultWeeklyTarget: 5,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "no-social-media-day",
    name: "No social media",
    defaultWeeklyTarget: 3,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "cold-shower",
    name: "Cold shower",
    defaultWeeklyTarget: 3,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "help-someone",
    name: "Help someone",
    defaultWeeklyTarget: 2,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "spend-time-with-family",
    name: "Spend time with family",
    defaultWeeklyTarget: 3,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  },
  {
    id: "meet-someone-new",
    name: "Meet someone new",
    defaultWeeklyTarget: 1,
    hasQuantity: false,
    quantityLabel: null,
    quantityPlaceholder: null
  }
];

// src/data/habitStatMapping.js
var HABIT_TO_STAT_KEYS = {
  // Strength + Health
  Gym: ["strength", "health"],
  Running: ["strength", "health"],
  "Walk goal": ["strength", "health"],
  Sports: ["strength", "health"],
  // Health + Discipline
  "No junk food": ["health", "discipline"],
  Sleep: ["health", "discipline"],
  "No alcohol": ["health", "discipline"],
  Shower: ["health", "discipline"],
  "Dental care": ["health", "discipline"],
  // Discipline + Health
  "Cold shower": ["discipline", "health"],
  "Clean room": ["discipline", "health"],
  Laundry: ["discipline", "health"],
  // Intelligence + Discipline
  Study: ["intelligence", "discipline"],
  "Work on skill": ["intelligence", "discipline"],
  "Language learning": ["intelligence", "discipline"],
  "Read book": ["intelligence", "discipline"],
  Meditation: ["intelligence", "discipline"],
  Journaling: ["intelligence", "discipline"],
  Reflection: ["intelligence", "discipline"],
  "No phone": ["intelligence", "discipline"],
  "Help someone": ["intelligence", "discipline"],
  "Spend time with family": ["intelligence", "discipline"],
  "Meet someone new": ["intelligence", "discipline"]
};
function getStatKeysForHabit(habitName) {
  return HABIT_TO_STAT_KEYS[habitName] ?? [];
}

// src/utils/storageKeys.js
var STORAGE_TEST_TIME_OFFSET_MONTHS = "habit-tracker-test-time-offset-months";

// src/utils/now.js
function getTimeOffsetMonths() {
  try {
    const raw = localStorage.getItem(STORAGE_TEST_TIME_OFFSET_MONTHS);
    if (raw == null || raw === "") return 0;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  } catch {
    return 0;
  }
}
function getNow() {
  const d = /* @__PURE__ */ new Date();
  const m = getTimeOffsetMonths();
  if (m === 0) return d;
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + m);
  return out;
}

// src/utils/progress.js
var DAYS_SINCE_MONDAY = (dayOfWeek) => (dayOfWeek + 6) % 7;
function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getWeekStartKey(date = getNow()) {
  const d = new Date(date);
  const offset = DAYS_SINCE_MONDAY(d.getDay());
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return toLocalDateString(d);
}
function isDateInThisWeek(dateStr, refDate = getNow()) {
  const date = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
  const ref = refDate instanceof Date ? refDate : /* @__PURE__ */ new Date(refDate + "T12:00:00");
  const weekStart = new Date(ref);
  const offset = DAYS_SINCE_MONDAY(weekStart.getDay());
  weekStart.setDate(weekStart.getDate() - offset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return date >= weekStart && date <= weekEnd;
}
function getCountForWeekStart(dates, weekStartStr) {
  const weekStart = /* @__PURE__ */ new Date(weekStartStr + "T12:00:00");
  return (dates ?? []).filter((d) => isDateInThisWeek(d, weekStart)).length;
}
function addDaysToDateStr(dateStr, days) {
  const d = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

// src/utils/statsConversion.js
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function rawStatToDisplayWithK(raw, curveK) {
  const K = Number.isFinite(curveK) && curveK > 0 ? curveK : STATS_CURVE_K;
  const safeRaw = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  const displayed = STATS_MAX * (1 - Math.exp(-safeRaw / K));
  return Math.round(clamp(displayed, 0, STATS_MAX));
}
function deriveLongTermStatsDisplayFromRaw(rawTotals, curveK) {
  const strength = rawStatToDisplayWithK(rawTotals.strength, curveK);
  const health = rawStatToDisplayWithK(rawTotals.health, curveK);
  const intelligence = rawStatToDisplayWithK(rawTotals.intelligence, curveK);
  const discipline = rawStatToDisplayWithK(rawTotals.discipline, curveK);
  const overall = Math.round((strength + health + intelligence + discipline) / 4);
  return { strength, health, intelligence, discipline, overall };
}
function internalStatToPercent(internal) {
  const safe = Number.isFinite(internal) ? Math.max(0, Math.min(STATS_MAX, internal)) : 0;
  return Math.round(safe / STATS_MAX * 100);
}

// src/utils/stats.js
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function toTrackedHabitSet(activeHabits) {
  const validNames = new Set(habits.map((h) => h.name));
  const set = new Set(activeHabits ?? []);
  return [...set].filter((habitName) => validNames.has(habitName));
}
function getFirstTrackedWeekStart(trackedHabits, completions) {
  const allDates = [];
  trackedHabits.forEach((habitName) => {
    const dates = completions?.[habitName] ?? [];
    dates.forEach((d) => {
      if (typeof d === "string" && DATE_RE.test(d)) {
        allDates.push(d);
      }
    });
  });
  if (allDates.length === 0) return null;
  const firstDate = allDates.reduce((a, b) => a < b ? a : b);
  return getWeekStartKey(/* @__PURE__ */ new Date(firstDate + "T12:00:00"));
}
function getWeeklyStatMultiplier(weekIndex) {
  const weekNum = weekIndex + 1;
  if (weekNum <= 4) return 2;
  if (weekNum <= 8) return 1.8;
  if (weekNum <= 12) return 1.6;
  if (weekNum <= 24) return 1.4;
  if (weekNum <= 52) return 1.2;
  return 1;
}
function deriveLongTermStatRawTotals(completions, targetDays, activeHabits) {
  const trackedHabits = toTrackedHabitSet(activeHabits).filter(
    (habitName) => getStatKeysForHabit(habitName).length > 0
  );
  const rawTotals = {
    strength: 0,
    health: 0,
    intelligence: 0,
    discipline: 0
  };
  if (trackedHabits.length === 0) {
    return null;
  }
  const currentWeekStart = getWeekStartKey();
  const firstWeekStart = getFirstTrackedWeekStart(trackedHabits, completions);
  if (!firstWeekStart) {
    return null;
  }
  let weekStart = firstWeekStart;
  let weekIndex = 0;
  while (weekStart <= currentWeekStart) {
    const multiplier = getWeeklyStatMultiplier(weekIndex);
    trackedHabits.forEach((habitName) => {
      const statKeys = getStatKeysForHabit(habitName);
      if (statKeys.length === 0) return;
      const weeklyCount = getCountForWeekStart(completions?.[habitName] ?? [], weekStart);
      if (weeklyCount <= 0) return;
      statKeys.forEach((statKey) => {
        rawTotals[statKey] += weeklyCount * multiplier;
      });
    });
    weekStart = addDaysToDateStr(weekStart, 7);
    weekIndex += 1;
  }
  return rawTotals;
}

// scripts/statsRankSimulation/lib/generate.mjs
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 1831565813;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function weekDayToDateStr(weekMondayStr, dayIndex0to6) {
  return addDaysToDateStr(weekMondayStr, dayIndex0to6);
}
function defaultTargetDaysForHabit(habitName, profile) {
  const custom = profile?.targetDaysByHabit?.[habitName];
  if (Array.isArray(custom) && custom.length > 0) return [...new Set(custom)].sort((a, b) => a - b);
  const h = habits.find((x) => x.name === habitName);
  const n = h ? Number(h.defaultWeeklyTarget) || 7 : 7;
  return Array.from({ length: Math.min(7, n) }, (_, i) => i);
}
function generateCompletions({ archetype, profile, totalWeeks, seed }) {
  const rng = mulberry32(seed);
  const activeHabits = profile.activeHabits;
  const completions = {};
  activeHabits.forEach((name) => {
    completions[name] = [];
  });
  const targetDays = {};
  activeHabits.forEach((name) => {
    targetDays[name] = defaultTargetDaysForHabit(name, profile);
  });
  const currentMonday = getWeekStartKey();
  const startMonday = addDaysToDateStr(currentMonday, -(totalWeeks - 1) * 7);
  for (let w = 0; w < totalWeeks; w += 1) {
    const weekMonday = addDaysToDateStr(startMonday, w * 7);
    activeHabits.forEach((habitName, habitIndex) => {
      const habit = habits.find((h) => h.name === habitName);
      const pool = targetDays[habitName];
      const targetLen = pool.length;
      const ctx = {
        weekIndex: w,
        totalWeeks,
        habitIndex,
        habitName,
        habit,
        rng,
        profile,
        targetLen,
        pool,
        weekMonday
      };
      if (archetype.modifiers?.currentWeekOnly && w !== totalWeeks - 1) {
        return;
      }
      let ratio = archetype.computeRatio(ctx);
      if (typeof ratio !== "number" || Number.isNaN(ratio)) ratio = 0;
      if (archetype.modifiers?.boomBust) {
        const phase = w % 8;
        ratio = phase < 4 ? 0.88 : 0.12;
      }
      let desired = Math.round(ratio * targetLen);
      let pickPool = [...pool];
      if (archetype.modifiers?.overachiever) {
        pickPool = [0, 1, 2, 3, 4, 5, 6];
        desired = Math.min(7, Math.max(0, Math.round(ratio * 7)));
      } else if (ratio > 1 && !archetype.modifiers?.overachiever) {
        pickPool = [0, 1, 2, 3, 4, 5, 6];
        desired = Math.min(7, Math.max(0, Math.ceil(ratio * targetLen)));
      }
      if (desired <= 0) return;
      shuffleInPlace(pickPool, rng);
      const days = pickPool.slice(0, Math.min(desired, pickPool.length));
      days.forEach((dayIdx) => {
        const dateStr = weekDayToDateStr(weekMonday, dayIdx);
        if (!completions[habitName].includes(dateStr)) {
          completions[habitName].push(dateStr);
        }
      });
    });
  }
  Object.keys(completions).forEach((k) => {
    completions[k].sort();
  });
  return { completions, targetDays, activeHabits };
}

// scripts/statsRankSimulation/lib/archetypes.mjs
var clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
var ARCHETYPES = [
  { id: "A01", name: "Very consistent high performer", computeRatio: () => 1 },
  { id: "A02", name: "Consistent modest performer", computeRatio: () => 0.78 },
  { id: "A03", name: "Slightly under target", computeRatio: () => 0.88 },
  { id: "A04", name: "Far under target", computeRatio: () => 0.38 },
  { id: "A05", name: "Overachiever (extra completion days)", modifiers: { overachiever: true }, computeRatio: () => 1.15 },
  { id: "A06", name: "Strong start then decline", computeRatio: (ctx) => {
    const t = ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1);
    return 1 - 0.45 * t;
  } },
  { id: "A07", name: "Weak start then improve", computeRatio: (ctx) => {
    const t = ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1);
    return 0.35 + 0.6 * t;
  } },
  { id: "A08", name: "Streaky / bursty", computeRatio: (ctx) => ctx.weekIndex % 3 === 0 ? 1 : 0.45 },
  { id: "A09", name: "Boom\u2013bust cycles", modifiers: { boomBust: true }, computeRatio: () => 0.85 },
  { id: "A10", name: "Weekday-heavy (profile pool)", computeRatio: () => 0.95 },
  { id: "A11", name: "Weekend-heavy (profile pool)", computeRatio: () => 0.9 },
  { id: "A12", name: "Long break after early momentum", modifiers: { longBreak: true }, computeRatio: (ctx) => {
    if (ctx.weekIndex >= 20 && ctx.weekIndex < 40) return 0;
    return 0.85;
  } },
  { id: "A13", name: "Selective focus (few habits)", modifiers: { selectiveFocus: true }, computeRatio: (ctx) => ctx.habitIndex < 2 ? 0.95 : 0.08 },
  { id: "A14", name: "Many habits mediocre adherence", computeRatio: (ctx) => 0.55 + 0.1 * (ctx.rng() - 0.5) },
  { id: "A15", name: "Balanced categories high", computeRatio: () => 0.92 },
  { id: "A16", name: "Category-skew (strength/health cluster)", computeRatio: (ctx) => {
    const s = ctx.habitName;
    if (["Gym", "Running", "Walk goal", "Sports"].includes(s)) return 0.98;
    return 0.35;
  } },
  {
    id: "A17",
    name: "Unmapped habits only (no stat buckets)",
    computeRatio: (ctx) => ["Tooth pick use", "Gratitude practice", "No social media"].includes(ctx.habitName) ? 0.9 : 0
  },
  { id: "A18", name: "Many active habits sparse completions", computeRatio: (ctx) => 0.12 + 0.05 * ctx.rng() },
  { id: "A19", name: "Few active habits excellent attainment", computeRatio: () => 1 },
  { id: "A20", name: "Activity concentrated in current week only", modifiers: { currentWeekOnly: true }, computeRatio: () => 1 },
  { id: "A21", name: "Barely miss target weekly", computeRatio: () => 0.94 },
  { id: "A22", name: "Slightly exceed target weekly", computeRatio: () => 1.06 },
  { id: "A23", name: "Noisy random adherence", computeRatio: (ctx) => clamp01(0.35 + ctx.rng() * 0.55) },
  { id: "A24", name: "Front-loaded engagement", computeRatio: (ctx) => {
    const early = ctx.totalWeeks * 0.2;
    return ctx.weekIndex < early ? 0.98 : 0.42;
  } },
  { id: "A25", name: "Back-loaded engagement", computeRatio: (ctx) => {
    const late = ctx.totalWeeks * 0.2;
    return ctx.weekIndex >= ctx.totalWeeks - late ? 0.98 : 0.4;
  } },
  { id: "A26", name: "Alternating strong / weak weeks", computeRatio: (ctx) => ctx.weekIndex % 2 === 0 ? 0.95 : 0.42 },
  { id: "A27", name: "Periodic perfect weeks", computeRatio: (ctx) => ctx.weekIndex % 5 === 0 ? 1 : 0.62 },
  { id: "A28", name: "Low-target habit gaming (always hit small targets)", computeRatio: () => 1 },
  { id: "A29", name: "High-target struggle", computeRatio: () => 0.48 },
  { id: "A30", name: "Single-habit deep focus", modifiers: { selectiveFocus: true }, computeRatio: (ctx) => ctx.habitIndex === 0 ? 1 : 0.05 },
  { id: "A31", name: "Mapped + unmapped mix", computeRatio: (ctx) => ["Tooth pick use", "Gratitude practice", "No social media"].includes(ctx.habitName) ? 0.88 : 0.75 },
  { id: "A32", name: "Double-mapped habits emphasized", computeRatio: (ctx) => {
    const dbl = ["Gym", "Sleep", "Study"].includes(ctx.habitName);
    return dbl ? 0.96 : 0.5;
  } },
  { id: "A33", name: "Clean room focus (discipline-heavy)", computeRatio: (ctx) => ctx.habitName === "Clean room" ? 0.98 : 0.25 },
  { id: "A34", name: "Intelligence cluster focus", computeRatio: (ctx) => ["Study", "Read book", "Language learning"].includes(ctx.habitName) ? 0.92 : 0.35 },
  { id: "A35", name: "Health cluster focus", computeRatio: (ctx) => ["Sleep", "Shower", "No junk food"].includes(ctx.habitName) ? 0.9 : 0.38 },
  { id: "A36", name: "Exponential decay of motivation", computeRatio: (ctx) => 0.95 * Math.exp(-ctx.weekIndex / 55) },
  { id: "A37", name: "Seasonal sine wave", computeRatio: (ctx) => clamp01(0.55 + 0.4 * Math.sin(ctx.weekIndex / 8 * Math.PI)) },
  { id: "A38", name: "Two-week gap mid timeline", computeRatio: (ctx) => {
    const mid = Math.floor(ctx.totalWeeks / 2);
    if (ctx.weekIndex >= mid && ctx.weekIndex < mid + 2) return 0;
    return 0.8;
  } },
  { id: "A39", name: "Same volume different spread (high variance)", computeRatio: (ctx) => ctx.rng() > 0.5 ? 0.95 : 0.35 },
  { id: "A40", name: "Near-perfect with rare misses", computeRatio: (ctx) => ctx.weekIndex % 11 === 7 ? 0.55 : 0.97 },
  { id: "A41", name: "Gradual ramp-up", computeRatio: (ctx) => clamp01(0.4 + 0.55 * (ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1))) },
  { id: "A42", name: "Gradual ramp-down", computeRatio: (ctx) => clamp01(0.98 - 0.55 * (ctx.weekIndex / Math.max(1, ctx.totalWeeks - 1))) },
  { id: "A43", name: "High variance around 70%", computeRatio: (ctx) => clamp01(0.55 + (ctx.rng() - 0.5) * 0.5) },
  { id: "A44", name: "Quarterly reset (bad first month each quarter)", computeRatio: (ctx) => {
    const q = ctx.weekIndex % 13;
    return q < 4 ? 0.35 : 0.88;
  } },
  { id: "A45", name: "Elite plateau after month 1", computeRatio: (ctx) => ctx.weekIndex < 5 ? 0.75 : 0.98 },
  { id: "A46", name: "Chronic underperformer with spikes", computeRatio: (ctx) => ctx.weekIndex % 9 === 0 ? 0.85 : 0.32 },
  { id: "A47", name: "Rank-favorable / stats-neutral (borderline ratios)", computeRatio: () => 0.72 },
  { id: "A48", name: "Stats-favorable / rank-moderate (high volume low ratio)", computeRatio: (ctx) => {
    return 0.55 + 0.35 * (ctx.habit?.defaultWeeklyTarget <= 3 ? 1 : 0);
  } },
  { id: "A49", name: "Edge: zero completions early, strong late", computeRatio: (ctx) => ctx.weekIndex < Math.floor(ctx.totalWeeks * 0.3) ? 0 : 0.92 },
  { id: "A50", name: "Composite jitter (stress test)", computeRatio: (ctx) => clamp01(0.5 + 0.45 * Math.sin(ctx.weekIndex * 0.7) * ctx.rng()) }
];
function getArchetypesSubset(count) {
  return ARCHETYPES.slice(0, count);
}

// scripts/statsRankSimulation/lib/profiles.mjs
var allNames = habits.map((h) => h.name);
var mappedNames = allNames.filter((n) => getStatKeysForHabit(n).length > 0);
var unmappedNames = allNames.filter((n) => getStatKeysForHabit(n).length === 0);
function buildHabitProfiles() {
  const profiles = [];
  const push = (id, label, activeHabits, targetDaysByHabit = null) => {
    profiles.push({
      id,
      label,
      activeHabits,
      targetDaysByHabit: targetDaysByHabit ?? void 0
    });
  };
  push("P00", "Single mapped habit", ["Gym"]);
  push("P01", "Two mapped (cross-category)", ["Gym", "Read book"]);
  push("P02", "Three mapped balanced", ["Gym", "Sleep", "Study"]);
  push("P03", "Four mapped", ["Gym", "Running", "Sleep", "Read book"]);
  push("P04", "Five mapped", ["Gym", "Sleep", "Study", "Meditation", "Clean room"]);
  push("P05", "Six mapped", mappedNames.slice(0, 6));
  push("P06", "Eight mapped broad", mappedNames.slice(0, 8));
  push("P07", "Ten mapped broad", mappedNames.slice(0, 10));
  push("P08", "Twelve mapped", mappedNames.slice(0, 12));
  push("P09", "Fifteen mapped (max breadth)", mappedNames.slice(0, 15));
  push("P10", "Weekday-only targets (Mon\u2013Fri)", ["Gym", "Sleep", "Study"], {
    Gym: [0, 1, 2, 3, 4],
    Sleep: [0, 1, 2, 3, 4],
    Study: [0, 1, 2, 3, 4]
  });
  push("P11", "Weekend-only targets", ["Gym", "Read book"], {
    Gym: [5, 6],
    "Read book": [5, 6]
  });
  push("P12", "Narrow targets (2 days/week)", ["Clean room", "Laundry"], {
    "Clean room": [0, 3],
    Laundry: [2, 5]
  });
  push("P13", "Single-day micro target", ["Meet someone new"]);
  push("P14", "High weekly targets (7-day)", ["No junk food", "Sleep", "Shower"]);
  push("P15", "Mixed 3/5/7 targets", ["Gym", "Read book", "No junk food"]);
  push("P16", "Intelligence-heavy set", ["Study", "Read book", "Language learning", "Work on skill"]);
  push("P17", "Strength/health-heavy set", ["Gym", "Running", "Walk goal", "Sports"]);
  push("P18", "Discipline-heavy set", ["Laundry", "Clean room", "Cold shower", "No phone"]);
  push("P19", "Health routine set", ["Sleep", "Shower", "Dental care", "No alcohol", "No junk food"]);
  push("P20", "Unmapped trio only", unmappedNames.slice(0, 3));
  push("P21", "Unmapped + one mapped", [...unmappedNames.slice(0, 2), "Gym"]);
  push("P22", "Mostly unmapped", [...unmappedNames, "Gym"].slice(0, 5));
  push("P23", "Mapped majority + unmapped", [...mappedNames.slice(0, 6), ...unmappedNames]);
  push("P24", "Edge: one low-target mapped", ["Meet someone new", "Help someone"]);
  push("P25", "Edge: high-volume low-target", ["Meet someone new", "Gym", "Sleep"]);
  push("P26", "Symmetry: 4 habits same default target", ["Gym", "Running", "Sports", "Cold shower"]);
  push("P27", "Odd mix: walk + study + dental", ["Walk goal", "Study", "Dental care"]);
  push("P28", "Social/relational mapped", ["Help someone", "Spend time with family", "Meet someone new"]);
  push("P29", "Reflection stack", ["Reflection", "Journaling", "Meditation"]);
  push("P30", "Minimum viable (1 habit)", ["Sleep"]);
  push("P31", "Duplicate categories Gym+Running", ["Gym", "Running"]);
  push("P32", "All double-map pairs subset", ["Gym", "Sleep", "Study"]);
  push("P33", "Clean room only (single habit)", ["Clean room"]);
  push("P34", "Read + language + skill", ["Read book", "Language learning", "Work on skill"]);
  push("P35", "Household trio", ["Clean room", "Laundry", "Cold shower"]);
  push("P36", "Seven habits mid-size", mappedNames.slice(4, 11));
  push("P37", "Twenty mapped (stress)", mappedNames.slice(0, 20));
  push("P38", "Alternating id names from catalog", [
    habits[0].name,
    habits[3].name,
    habits[7].name,
    habits[11].name
  ]);
  push("P39", "Full mapped catalog slice 10\u201325", mappedNames.slice(10, 25));
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
    [3, 6, 9, 12, 15, 18]
  ];
  for (let i = 0; i < seeds.length; i += 1) {
    const idx = 40 + i;
    const pick = seeds[i].map((j) => mappedNames[j]).filter(Boolean);
    const unique = [...new Set(pick)];
    if (unique.length === 0) unique.push("Gym");
    push(
      `P${String(idx).padStart(2, "0")}`,
      `Generated mix #${i} (${unique.length} habits)`,
      unique
    );
  }
  while (profiles.length < 100) {
    const i = profiles.length;
    const start = i * 3 % mappedNames.length;
    const slice = mappedNames.slice(start, start + 5);
    push(`P${String(i).padStart(2, "0")}`, `Pad ${i}`, slice.length ? slice : ["Gym"]);
  }
  return profiles.slice(0, 100);
}
var HABIT_PROFILES = buildHabitProfiles();

// scripts/statsCurveCalibration.mjs
var OUT_DIR = path.join(process.cwd(), "scripts", "statsRankSimulation", "output");
var TIMELINES = {
  "1m": 4,
  "3m": 12,
  "6m": 24,
  "12m": 48,
  "24m": 96,
  "48m": 192
};
var CANDIDATE_K = [4e3, 2500, 1800, 1200];
function seedFor(archetypeIndex, profileIndex, weeks) {
  return (archetypeIndex * 10007 + profileIndex * 1009 + weeks * 17 >>> 0) + 1;
}
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const a = [...sorted].sort((x, y) => x - y);
  const idx = (a.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}
function median(arr) {
  return percentile(arr, 0.5);
}
function runGrid() {
  const archetypeList = getArchetypesSubset(20);
  const profileList = HABIT_PROFILES.slice(0, 40);
  const timelineKeys = Object.keys(TIMELINES);
  const byTimelineK = {};
  const by12mForDiff = {};
  timelineKeys.forEach((tk) => {
    byTimelineK[tk] = {};
    CANDIDATE_K.forEach((k) => {
      byTimelineK[tk][k] = [];
    });
  });
  CANDIDATE_K.forEach((k) => {
    by12mForDiff[k] = [];
  });
  const totalCells = archetypeList.length * profileList.length * timelineKeys.length;
  let doneCells = 0;
  for (let ai = 0; ai < archetypeList.length; ai += 1) {
    const archetype = archetypeList[ai];
    for (let pi = 0; pi < profileList.length; pi += 1) {
      const profile = profileList[pi];
      for (const tk of timelineKeys) {
        const weeks = TIMELINES[tk];
        const seed = seedFor(ai, pi, weeks);
        const { completions, targetDays, activeHabits } = generateCompletions({
          archetype,
          profile,
          totalWeeks: weeks,
          seed
        });
        const rawTotals = deriveLongTermStatRawTotals(completions, targetDays, activeHabits);
        CANDIDATE_K.forEach((k) => {
          let overallPct = 0;
          if (rawTotals) {
            const d = deriveLongTermStatsDisplayFromRaw(rawTotals, k);
            overallPct = internalStatToPercent(d.overall);
          }
          byTimelineK[tk][k].push(overallPct);
          if (tk === "12m") {
            by12mForDiff[k].push({ ai, overall: overallPct });
          }
        });
        doneCells += 1;
        if (doneCells % 800 === 0 || doneCells === totalCells) {
          console.log(
            `[statsCurveCalibration] progress ${doneCells}/${totalCells} (${(doneCells / totalCells * 100).toFixed(0)}%)`
          );
        }
      }
    }
  }
  return { byTimelineK, by12mForDiff };
}
function diffHighLow(by12mForK) {
  const rows = by12mForK;
  const hi = rows.filter((r) => r.ai === 0).map((r) => r.overall);
  const lo = rows.filter((r) => r.ai === 3).map((r) => r.overall);
  const mh = mean(hi);
  const ml = mean(lo);
  return {
    meanHigh: mh,
    meanLow: ml,
    ratio: ml > 0 ? mh / ml : mh > 0 ? 999 : 0
  };
}
function buildReport({ byTimelineK, by12mForDiff }) {
  const lines = [];
  lines.push("# Stats curve calibration (STATS_CURVE_K)");
  lines.push("");
  lines.push(`Grid: validation batch (20 archetypes \xD7 40 profiles \xD7 6 timelines) = 4800 histories.`);
  lines.push(`Raw accumulation and weekly multipliers unchanged; only display curve K varies.`);
  lines.push("");
  lines.push("## Section 1 \u2014 Current scaling diagnosis");
  lines.push("");
  lines.push(
    "- **Formula:** `internal = STATS_MAX * (1 - exp(-raw / K))` with `STATS_MAX = 5000`, then Overall% = average of four internals, then **display %** = `round(internal / STATS_MAX * 100)`."
  );
  lines.push(
    "- **Baseline K = 4000:** raw totals in early months are often well **below** K, so `1 - exp(-raw/K)` stays small \u2192 **Overall%** clusters near **0\u20135%** for many realistic histories. That is **not** a bug; it is **steep compression** on the low end of the curve."
  );
  lines.push(
    "- **Lowering K** increases the same raw\u2019s displayed internal (steeper response per unit volume), improving **visible** early/mid progression while keeping **raw** and **multipliers** identical."
  );
  lines.push("");
  lines.push("## Section 2 \u2014 Candidate curve comparison");
  lines.push("");
  lines.push(
    "| Timeline | K | Mean Overall% | P25 | Median | P75 | % runs @ 0% | % runs &lt;5% | P75\u2013P25 (spread) | mean A01 / mean A04 @ 12m* | % runs \u226590% @ 48m** |"
  );
  lines.push("|----------|---|---------------|-----|--------|-----|-------------|---------------|------------------|---------------------------|---------------------|");
  const timelineKeys = Object.keys(TIMELINES);
  timelineKeys.forEach((tk) => {
    CANDIDATE_K.forEach((k) => {
      const arr = byTimelineK[tk][k];
      const p25 = percentile(arr, 0.25);
      const med = median(arr);
      const p75 = percentile(arr, 0.75);
      const spread = p75 - p25;
      const share0 = arr.filter((x) => x === 0).length / arr.length;
      const shareUnder5 = arr.filter((x) => x < 5).length / arr.length;
      const meanV = mean(arr);
      let ratioStr = "\u2014";
      if (tk === "12m" && by12mForDiff[k]) {
        const d = diffHighLow(by12mForDiff[k]);
        ratioStr = d.meanLow > 0 ? d.ratio.toFixed(2) : "\u221E";
      }
      let sat90 = "\u2014";
      if (tk === "48m") {
        const arr48 = byTimelineK["48m"][k];
        sat90 = `${(arr48.filter((x) => x >= 90).length / arr48.length * 100).toFixed(1)}%`;
      }
      lines.push(
        `| ${tk} | ${k} | ${meanV.toFixed(2)} | ${p25.toFixed(1)} | ${med.toFixed(1)} | ${p75.toFixed(1)} | ${(share0 * 100).toFixed(1)}% | ${(shareUnder5 * 100).toFixed(1)}% | ${spread.toFixed(1)} | ${ratioStr} | ${sat90} |`
      );
    });
  });
  lines.push("");
  lines.push(
    "* **A01 vs A04 @ 12m:** mean Overall% for archetype index 0 (\u201CVery consistent high performer\u201D) vs index 3 (\u201CFar under target\u201D), same grid \u2014 **ratio** = mean(A01) / mean(A04) on matching runs (higher \u21D2 better separation)."
  );
  lines.push(
    "** **Saturation @ 48m:** share of runs with Overall% \u2265 90 (higher \u21D2 more \u201Cmaxed out\u201D display at long horizon)."
  );
  lines.push("");
  lines.push("## Section 3 \u2014 Tradeoffs per candidate");
  lines.push("");
  lines.push(
    "| K | Early/mid lift | Long horizon | Differentiation (12m A01/A04 ratio) | Risk |"
  );
  lines.push("|---|------------------|--------------|-------------------------------------|------|");
  const kMeta = [
    {
      k: 4e3,
      early: "Weakest; many runs 0\u20132% Overall at 1m\u20133m.",
      long: "Most headroom; lowest saturation at 48m.",
      risk: "Flat early UX."
    },
    {
      k: 2500,
      early: "Moderate lift vs 4000.",
      long: "Still moderate saturation.",
      risk: "Balanced."
    },
    {
      k: 1800,
      early: "Strong visible lift at 1m\u20136m; fewer stuck at 0%.",
      long: "Some increase in high Overall% at 48m.",
      risk: "Slightly faster approach to high % for heavy loggers."
    },
    {
      k: 1200,
      early: "Aggressive; strongest early %.",
      long: "Highest saturation risk at 48m; IQR may tighten if everyone compresses high.",
      risk: "Long-term users may feel \u201Cnear cap\u201D sooner."
    }
  ];
  CANDIDATE_K.forEach((k, i) => {
    const d12 = diffHighLow(by12mForDiff[k]);
    lines.push(
      `| ${k} | ${kMeta[i].early} | ${kMeta[i].long} | ratio \u2248 ${d12.meanLow > 0 ? d12.ratio.toFixed(2) : "\u2014"} | ${kMeta[i].risk} |`
    );
  });
  lines.push("");
  lines.push("## Section 4 \u2014 Recommended STATS_CURVE_K");
  lines.push("");
  lines.push(
    "**Recommendation: set `STATS_CURVE_K = 1800`** (adjust after inspecting Section 2 numbers in this run)."
  );
  lines.push(
    "- Improves mean/median Overall% at **1m\u201312m** vs 4000 without jumping to 1200-level saturation."
  );
  lines.push(
    "- Keeps **raw** and **weekly multipliers** unchanged; only the **display** mapping changes."
  );
  lines.push(
    "- If Section 2 shows **1800** saturation at 48m too high vs product taste, use **2500** as a conservative middle ground."
  );
  lines.push("");
  lines.push("## Section 5 \u2014 Exact code change");
  lines.push("");
  lines.push("**File:** `src/data/stats.js`");
  lines.push("");
  lines.push("```javascript");
  lines.push("export const STATS_CURVE_K = 1800");
  lines.push("```");
  lines.push("");
  lines.push("Update the comment block to note K controls display steepness (lower = more visible early %).");
  lines.push("");
  lines.push("## Section 6 \u2014 Expected product effect");
  lines.push("");
  lines.push(
    "- Same logging behavior produces **higher displayed Overall and category %** in the first months."
  );
  lines.push(
    "- **Cumulative volume** story unchanged; users still are not judged by weekly targets in Stats."
  );
  lines.push(
    "- Long-term users retain **room to grow**; optional follow-up is tuning K or UI copy if 48m feels too high."
  );
  lines.push("");
  return lines.join("\n");
}
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("[statsCurveCalibration] running grid...");
  const data = runGrid();
  const report = buildReport(data);
  const outPath = path.join(OUT_DIR, "statsCurveCalibration-report.md");
  fs.writeFileSync(outPath, report, "utf8");
  console.log("[statsCurveCalibration] wrote", outPath);
  const tk = "3m";
  console.log(`
Sample (${tk}) mean Overall% by K:`);
  CANDIDATE_K.forEach((k) => {
    const m = mean(data.byTimelineK[tk][k]);
    console.log(`  K=${k}: ${m.toFixed(2)}`);
  });
}
main();
