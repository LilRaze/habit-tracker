import { habits } from '../data/habits'
import { getWeekStartKey, getCountForWeekStart, addDaysToDateStr } from './progress'
import { RANK_LADDER } from '../data/ranks'

// ---- Matrix definition (same as V3, but used for weekly gains) ----

const MATRIX_WEEKS = [4, 12, 48, 96, 144, 192, 240]

const MATRIX_CONSISTENCIES = [
  0.0, 0.05, 0.1, 0.15, 0.2,
  0.25, 0.3, 0.35, 0.4, 0.45,
  0.5, 0.55, 0.6, 0.65, 0.7,
  0.75, 0.8, 0.85, 0.9, 0.95,
  1.0,
]

const RAW_MATRIX_LABELS = [
  // 0%
  ['Unranked', 'Unranked', 'Unranked', 'Unranked', 'Unranked', 'Unranked', 'Unranked'],
  // 5%
  ['Unranked', 'Unranked', 'Unranked', 'Unranked', 'Iron IV', 'Iron IV', 'Iron III'],
  // 10%
  ['Unranked', 'Unranked', 'Unranked', 'Iron IV', 'Iron III', 'Iron III', 'Iron II'],
  // 15%
  ['Unranked', 'Unranked', 'Iron IV', 'Iron IV', 'Iron II', 'Iron I', 'Bronze IV'],
  // 20%
  ['Unranked', 'Unranked', 'Iron IV', 'Iron III', 'Iron II', 'Iron I', 'Bronze IV'],
  // 25%
  ['Unranked', 'Unranked', 'Iron IV', 'Iron II', 'Iron I', 'Bronze IV', 'Bronze III'],
  // 30%
  ['Unranked', 'Iron IV', 'Iron III', 'Iron I', 'Bronze IV', 'Bronze III', 'Bronze II'],
  // 35%
  ['Unranked', 'Iron IV', 'Iron II', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I'],
  // 40%
  ['Iron IV', 'Iron III', 'Iron I', 'Bronze II', 'Bronze I', 'Silver IV', 'Silver III'],
  // 45%
  ['Iron IV', 'Iron II', 'Bronze IV', 'Bronze I', 'Silver IV', 'Silver III', 'Silver II'],
  // 50%
  ['Iron IV/Unranked', 'Iron II', 'Bronze II', 'Silver IV', 'Silver II', 'Silver I', 'Gold IV'],
  // 55%
  ['Iron IV', 'Bronze IV', 'Bronze I', 'Silver III', 'Silver I', 'Gold IV', 'Gold III'],
  // 60%
  ['Iron IV', 'Bronze III', 'Silver IV', 'Silver II', 'Gold IV', 'Gold III', 'Gold II'],
  // 65%
  ['Iron IV', 'Bronze IV', 'Silver III', 'Silver I', 'Gold III', 'Gold II', 'Platinum IV'],
  // 70%
  ['Iron IV', 'Bronze II', 'Silver II', 'Gold IV', 'Gold II', 'Gold I', 'Platinum III'],
  // 75%
  ['Iron IV', 'Bronze II', 'Gold IV', 'Gold II', 'Platinum IV', 'Platinum III', 'Platinum I'],
  // 80%
  ['Iron IV', 'Silver IV', 'Gold III', 'Platinum IV', 'Platinum II', 'Platinum I', 'Emerald IV'],
  // 85%
  ['Iron IV', 'Silver IV', 'Gold I', 'Platinum III', 'Platinum I', 'Emerald IV', 'Emerald II'],
  // 90%
  ['Iron III', 'Silver III', 'Platinum IV', 'Emerald IV', 'Emerald III', 'Emerald I', 'Diamond IV'],
  // 95%
  ['Iron II', 'Silver II', 'Platinum III', 'Emerald II', 'Diamond IV', 'Diamond II', 'Diamond I'],
  // 100%
  ['Iron I', 'Silver I', 'Platinum IV', 'Emerald III', 'Diamond IV', 'Diamond I', 'Master'],
]

function rankLabelToProgress(label) {
  if (!label || label === 'Unranked') return 0
  if (label === 'Iron IV/Unranked') {
    // Midpoint between Unranked (0) and Iron IV (100)
    return 50
  }
  const index = RANK_LADDER.indexOf(label)
  if (index <= 0) return 0
  return index * 100
}

const MATRIX_PROGRESS = RAW_MATRIX_LABELS.map((row) =>
  row.map((label) => rankLabelToProgress(label))
)

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function lerp(a, b, t) {
  if (!Number.isFinite(t)) return a
  const tt = t < 0 ? 0 : t > 1 ? 1 : t
  return a + (b - a) * tt
}

// ---- Smooth cumulative curves per row using monotone cubic Hermite interpolation ----

const ANCHOR_WEEKS = [0, ...MATRIX_WEEKS]

function buildMonotoneCubicSpline(xs, ys) {
  const n = xs.length
  const m = new Array(n - 1)
  const d = new Array(n)

  for (let i = 0; i < n - 1; i += 1) {
    const h = xs[i + 1] - xs[i]
    m[i] = h !== 0 ? (ys[i + 1] - ys[i]) / h : 0
  }

  d[0] = m[0]
  for (let i = 1; i < n - 1; i += 1) {
    if (m[i - 1] * m[i] <= 0) {
      d[i] = 0
    } else {
      d[i] = (m[i - 1] + m[i]) / 2
    }
  }
  d[n - 1] = m[n - 2]

  for (let i = 0; i < n - 1; i += 1) {
    if (m[i] === 0) {
      d[i] = 0
      d[i + 1] = 0
    } else {
      const a = d[i] / m[i]
      const b = d[i + 1] / m[i]
      const s = a * a + b * b
      if (s > 9) {
        const t = 3 / Math.sqrt(s)
        d[i] = a * t * m[i]
        d[i + 1] = b * t * m[i]
      }
    }
  }

  return function evalSpline(x) {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i < n - 1 && x > xs[i + 1]) {
      i += 1
    }
    const h = xs[i + 1] - xs[i]
    const t = (x - xs[i]) / h
    const t2 = t * t
    const t3 = t2 * t
    const h00 = (2 * t3) - (3 * t2) + 1
    const h10 = t3 - (2 * t2) + t
    const h01 = (-2 * t3) + (3 * t2)
    const h11 = t3 - t2
    return (
      h00 * ys[i] +
      h10 * h * d[i] +
      h01 * ys[i + 1] +
      h11 * h * d[i + 1]
    )
  }
}

// For each row, build P_row(week) and per-week discrete derivative.
const ROW_WEEKLY_GAINS = (() => {
  const result = []
  for (let r = 0; r < MATRIX_PROGRESS.length; r += 1) {
    const row = MATRIX_PROGRESS[r]
    const ys = [0, ...row]
    const spline = buildMonotoneCubicSpline(ANCHOR_WEEKS, ys)
    const gains = {}
    let prev = spline(0)
    for (let w = 1; w <= 240; w += 1) {
      const cur = spline(w)
      const g = cur - prev
      gains[w] = g < 0 ? 0 : g
      prev = cur
    }
    result.push(gains)
  }
  return result
})()

function interpolateWeeklyGain(consistency, weekNumber) {
  const c = clamp01(consistency)
  const w = Math.max(1, Math.min(weekNumber, 240))

  let rowLo = 0
  let rowHi = MATRIX_CONSISTENCIES.length - 1
  for (let i = 0; i < MATRIX_CONSISTENCIES.length - 1; i += 1) {
    const c0 = MATRIX_CONSISTENCIES[i]
    const c1 = MATRIX_CONSISTENCIES[i + 1]
    if (c >= c0 && c <= c1) {
      rowLo = i
      rowHi = i + 1
      break
    }
  }
  const cLo = MATRIX_CONSISTENCIES[rowLo]
  const cHi = MATRIX_CONSISTENCIES[rowHi]
  const tC = cHi > cLo ? (c - cLo) / (cHi - cLo) : 0

  const gLo = ROW_WEEKLY_GAINS[rowLo][w] || 0
  const gHi = ROW_WEEKLY_GAINS[rowHi][w] || 0
  return lerp(gLo, gHi, tC)
}

function progressToRank(progress) {
  const p = Math.max(0, progress)
  const index = Math.min(RANK_LADDER.length - 1, Math.floor(p / 100))
  const rank = RANK_LADDER[index]
  const lp = index >= RANK_LADDER.length - 1 ? 99 : Math.round(p - index * 100)
  return { rank, lp }
}

function computeWeeklyRatios(dates, habit, targetDaysForHabit) {
  const history = Array.isArray(dates) ? dates.slice().sort() : []
  if (history.length === 0) {
    return { ratios: [], weeksEvaluated: 0 }
  }

  const currentWeekStart = getWeekStartKey()
  const lastFullWeekStart = addDaysToDateStr(currentWeekStart, -7)

  const firstDateStr = history[0]
  let weekStart = getWeekStartKey(new Date(firstDateStr + 'T12:00:00'))

  const ratios = []
  while (weekStart <= lastFullWeekStart) {
    const completed = getCountForWeekStart(history, weekStart)
    const selectedCount = Array.isArray(targetDaysForHabit)
      ? targetDaysForHabit.length
      : 0
    const weeklyTarget =
      selectedCount && selectedCount > 0
        ? selectedCount
        : Number(habit.defaultWeeklyTarget) || 0

    if (weeklyTarget > 0) {
      const ratio = clamp01((Number(completed) || 0) / weeklyTarget)
      ratios.push(ratio)
    }

    weekStart = addDaysToDateStr(weekStart, 7)
  }

  return { ratios, weeksEvaluated: ratios.length }
}

export function deriveRanksV4(completions, targetDays, activeHabits) {
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

    const { ratios, weeksEvaluated } = computeWeeklyRatios(
      dates,
      habit,
      targets
    )
    if (weeksEvaluated === 0) {
      result[key] = {
        rank: 'Unranked',
        lp: 0,
        habitId: habit.id,
        habitName: habit.name,
        weeksEvaluated: 0,
        progressValue: 0,
      }
      return
    }

    let totalProgress = 0
    for (let i = 0; i < ratios.length; i += 1) {
      const weekNumber = i + 1
      const weeklyLp = interpolateWeeklyGain(ratios[i], weekNumber)
      totalProgress += weeklyLp
    }

    const { rank, lp } = progressToRank(totalProgress)

    result[key] = {
      rank,
      lp,
      habitId: habit.id,
      habitName: habit.name,
      weeksEvaluated,
      progressValue: totalProgress,
    }
  })

  const entries = Object.values(result)
  if (entries.length === 0) {
    return {
      overall: { rank: 'Unranked', lp: 0, progressValue: 0 },
      habits: [],
    }
  }

  const avgProgress = Math.round(
    entries.reduce((sum, h) => sum + (h.progressValue || 0), 0) / entries.length
  )
  const overall = {
    ...progressToRank(avgProgress),
    progressValue: avgProgress,
  }

  return {
    overall,
    habits: entries,
  }
}

// Debug helper: show implied weekly-gain surface matches matrix for constant histories.
export function runRankCalibrationSimulationV4() {
  const weeksCheckpoints = [4, 12, 48, 96, 144, 192, 240]
  const ratios = [0, 0.1, 0.25, 0.5, 0.65, 0.85, 1.0]

  const rows = []
  ratios.forEach((r) => {
    const row = { ratio: r }
    weeksCheckpoints.forEach((w) => {
      // Simulate constant-ratio user purely via interval gains.
      let total = 0
      for (let week = 1; week <= w; week += 1) {
        total += interpolateWeeklyGain(r, week)
      }
      const { rank, lp } = progressToRank(total)
      row[w] = { rank, lp, progressValue: Math.round(total) }
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

