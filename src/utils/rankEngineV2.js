import { habits } from '../data/habits'
import { getWeekStartKey, getCountForWeekStart, addDaysToDateStr } from './progress'
import { RANK_LADDER } from '../data/ranks'

// Base LP (quality curve) – ratio-only.
// Drives long-run progression; phase and taper only reshape time profile.
const BASE_OFFSET = -6
const BASE_SCALE = 26
const BASE_EXPONENT = 1.1

// Phase bonus – early/mid acceleration that decays smoothly.
// Much lower amplitude than the first attempt; spread more evenly across ~1–48 weeks.
const PHASE_A = 30
const PHASE_DECAY = 32
const PHASE_FLOOR = 0.2
const PHASE_RATIO_EXPONENT = 1.4

// Streak bonus – secondary reinforcement for repeated strong weeks.
const STREAK_RATIO_THRESHOLD = 0.8
const STREAK_MAX_BONUS = 3
const STREAK_EXP_K = 4

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function applyLpAndRanks(currentRank, currentLp, lpChange) {
  let rankIndex = RANK_LADDER.indexOf(currentRank)
  if (rankIndex < 0) rankIndex = 0
  let lp = currentLp + lpChange

  while (lp >= 100 && rankIndex < RANK_LADDER.length - 1) {
    lp -= 100
    rankIndex += 1
  }

  while (lp < 0 && rankIndex > 0) {
    rankIndex -= 1
    lp = 75
  }

  if (lp < 0) lp = 0
  if (rankIndex >= RANK_LADDER.length) rankIndex = RANK_LADDER.length - 1

  return { rank: RANK_LADDER[rankIndex], lp }
}

export function getBaseLp(ratio) {
  const r = clamp01(ratio)
  const value = BASE_OFFSET + BASE_SCALE * Math.pow(r, BASE_EXPONENT)
  return Math.round(value)
}

export function getPhaseBonus(weekNumber, ratio) {
  const r = clamp01(ratio)
  if (r <= 0) return 0
  const w = Math.max(1, weekNumber)
  const phaseScale = PHASE_A * Math.exp(-w / PHASE_DECAY) + PHASE_FLOOR
  const value = phaseScale * Math.pow(r, PHASE_RATIO_EXPONENT)
  return Math.round(value)
}

export function getStreakBonus(streakLength, ratio) {
  const r = clamp01(ratio)
  if (r < STREAK_RATIO_THRESHOLD || streakLength <= 0) return 0
  const s = Math.min(30, Math.max(1, streakLength))
  const norm = 1 - Math.exp(-s / STREAK_EXP_K)
  const value = STREAK_MAX_BONUS * norm
  return Math.round(value)
}

function getLongRunTaper(weekNumber) {
  const w = Math.max(1, weekNumber)
  if (w <= 48) return 1
  const extra = w - 48
  return 1 / (1 + extra / 52)
}

export function computeWeeklyLp({ completed, weeklyTarget, weekNumber, successStreak }) {
  const target = Number(weeklyTarget)
  if (!Number.isFinite(target) || target <= 0) {
    return { ratio: 0, lp: 0 }
  }
  const ratio = clamp01((Number(completed) || 0) / target)
  const base = getBaseLp(ratio)
  const phase = getPhaseBonus(weekNumber, ratio)
  const streak = getStreakBonus(successStreak, ratio)
  const raw = base + phase + streak
  const lp = Math.round(raw * getLongRunTaper(weekNumber))
  return { ratio, lp }
}

export function computeHabitRankFromHistory(dates, habit, targetDaysForHabit) {
  const history = Array.isArray(dates) ? dates.slice().sort() : []
  if (history.length === 0) {
    return { rank: 'Unranked', lp: 0, weeksEvaluated: 0 }
  }

  const todayWeekStart = getWeekStartKey()
  const lastFullWeekStart = addDaysToDateStr(todayWeekStart, -7)

  const firstDateStr = history[0]
  let weekStart = getWeekStartKey(new Date(firstDateStr + 'T12:00:00'))

  let rank = 'Unranked'
  let lp = 0
  let successStreak = 0
  let weekNumber = 0

  while (weekStart <= lastFullWeekStart) {
    weekNumber += 1
    const completed = getCountForWeekStart(history, weekStart)
    const selectedCount = Array.isArray(targetDaysForHabit)
      ? targetDaysForHabit.length
      : 0
    const weeklyTarget =
      selectedCount && selectedCount > 0
        ? selectedCount
        : Number(habit.defaultWeeklyTarget) || 0

    const { ratio, lp: weeklyLp } = computeWeeklyLp({
      completed,
      weeklyTarget,
      weekNumber,
      successStreak,
    })

    const next = applyLpAndRanks(rank, lp, weeklyLp)
    rank = next.rank
    lp = next.lp

    successStreak = ratio >= STREAK_RATIO_THRESHOLD ? successStreak + 1 : 0

    weekStart = addDaysToDateStr(weekStart, 7)
  }

  return { rank, lp, weeksEvaluated: weekNumber }
}

export function deriveRanksV2(completions, targetDays, activeHabits) {
  const result = {}
  const activeKeys = new Set(activeHabits ?? [])

  habits.forEach((habit) => {
    const key = habit.id || habit.name
    if (!activeKeys.has(habit.name) && !activeKeys.has(key)) {
      return
    }

    const datesByName = completions?.[habit.name] ?? []
    const datesById = completions?.[key] ?? []
    const dates =
      datesById.length >= datesByName.length ? datesById : datesByName

    const targetByName = targetDays?.[habit.name]
    const targetById = targetDays?.[key]
    const targets =
      Array.isArray(targetById) && targetById.length > 0
        ? targetById
        : targetByName

    const { rank, lp, weeksEvaluated } = computeHabitRankFromHistory(
      dates,
      habit,
      targets
    )

    result[key] = {
      rank,
      lp,
      habitId: habit.id,
      habitName: habit.name,
      weeksEvaluated,
    }
  })

  const entries = Object.values(result)
  if (entries.length === 0) {
    return {
      overall: { rank: 'Unranked', lp: 0, progressValue: 0 },
      habits: [],
    }
  }

  const values = entries.map((h) => {
    const rankIndex = RANK_LADDER.indexOf(h.rank)
    const safeRankIndex = rankIndex >= 0 ? rankIndex : 0
    const safeLp = Number.isFinite(h.lp) ? Math.max(0, Math.min(99, h.lp)) : 0
    return safeRankIndex * 100 + safeLp
  })
  const avg = Math.round(
    values.reduce((sum, v) => sum + v, 0) / values.length
  )
  const overallRankIndex = Math.min(
    RANK_LADDER.length - 1,
    Math.floor(Math.max(0, avg) / 100)
  )
  const overallLp =
    overallRankIndex >= RANK_LADDER.length - 1 ? 99 : avg % 100

  return {
    overall: {
      rank: RANK_LADDER[overallRankIndex],
      lp: overallLp,
      progressValue: avg,
    },
    habits: entries,
  }
}

export function runRankCalibrationSimulation() {
  const weeksCheckpoints = [4, 12, 48, 96, 144, 192, 240]
  const ratios = [0, 0.1, 0.25, 0.5, 0.65, 0.85, 1.0]
  const startRank = 'Unranked'

  function simulate(ratio, weeks) {
    let rank = startRank
    let lp = 0
    let streak = 0
    for (let w = 1; w <= weeks; w += 1) {
      const { lp: weeklyLp } = computeWeeklyLp({
        completed: ratio,
        weeklyTarget: 1,
        weekNumber: w,
        successStreak: streak,
      })
      const next = applyLpAndRanks(rank, lp, weeklyLp)
      rank = next.rank
      lp = next.lp
      streak = ratio >= STREAK_RATIO_THRESHOLD ? streak + 1 : 0
    }
    const rankIndex = RANK_LADDER.indexOf(rank)
    const progressValue = (rankIndex >= 0 ? rankIndex : 0) * 100 + lp
    return { rank, lp, progressValue }
  }

  const rows = []
  ratios.forEach((r) => {
    const row = { ratio: r }
    weeksCheckpoints.forEach((w) => {
      row[w] = simulate(r, w)
    })
    rows.push(row)
  })

  // eslint-disable-next-line no-console
  console.table(
    rows.map((row) => {
      const out = { ratio: row.ratio }
      weeksCheckpoints.forEach((w) => {
        out[`${w}w`] = row[w].rank
      })
      return out
    })
  )

  return rows
}

