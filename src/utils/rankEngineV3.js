import { habits } from '../data/habits'
import { getWeekStartKey, getCountForWeekStart, addDaysToDateStr } from './progress'
import { RANK_LADDER } from '../data/ranks'

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
  // 50%  (Iron IV/Unranked treated specially below)
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

function lerp(a, b, t) {
  if (!Number.isFinite(t)) return a
  const tt = t < 0 ? 0 : t > 1 ? 1 : t
  return a + (b - a) * tt
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function interpolateProgress(consistency, weeks) {
  const c = clamp01(consistency)
  const w = Math.max(0, weeks)

  // Handle before first checkpoint: interpolate from 0 at week 0 to week 4 column.
  if (w <= MATRIX_WEEKS[0]) {
    const t = MATRIX_WEEKS[0] === 0 ? 1 : w / MATRIX_WEEKS[0]
    const colIndex = 0
    // Interpolate vertically between consistency rows at this column.
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
    const pLo = MATRIX_PROGRESS[rowLo][colIndex]
    const pHi = MATRIX_PROGRESS[rowHi][colIndex]
    const pVert = lerp(pLo, pHi, tC)
    return lerp(0, pVert, t)
  }

  // Clamp after last checkpoint: use last column and last row interpolation only.
  if (w >= MATRIX_WEEKS[MATRIX_WEEKS.length - 1]) {
    const colIndex = MATRIX_WEEKS.length - 1
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
    const pLo = MATRIX_PROGRESS[rowLo][colIndex]
    const pHi = MATRIX_PROGRESS[rowHi][colIndex]
    return lerp(pLo, pHi, tC)
  }

  // Find bracketing week columns.
  let colLo = 0
  let colHi = MATRIX_WEEKS.length - 1
  for (let i = 0; i < MATRIX_WEEKS.length - 1; i += 1) {
    const w0 = MATRIX_WEEKS[i]
    const w1 = MATRIX_WEEKS[i + 1]
    if (w >= w0 && w <= w1) {
      colLo = i
      colHi = i + 1
      break
    }
  }
  const wLo = MATRIX_WEEKS[colLo]
  const wHi = MATRIX_WEEKS[colHi]
  const tW = wHi > wLo ? (w - wLo) / (wHi - wLo) : 0

  // Find bracketing consistency rows.
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

  const p00 = MATRIX_PROGRESS[rowLo][colLo]
  const p10 = MATRIX_PROGRESS[rowHi][colLo]
  const p01 = MATRIX_PROGRESS[rowLo][colHi]
  const p11 = MATRIX_PROGRESS[rowHi][colHi]

  const p0 = lerp(p00, p10, tC)
  const p1 = lerp(p01, p11, tC)
  return lerp(p0, p1, tW)
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

function computeConsistency(ratios) {
  if (!ratios || ratios.length === 0) return 0
  // Exponential moving average for stability: more weight on recent weeks.
  const alpha = 0.2
  let s = ratios[0]
  for (let i = 1; i < ratios.length; i += 1) {
    s = alpha * ratios[i] + (1 - alpha) * s
  }
  return clamp01(s)
}

export function deriveRanksV3(completions, targetDays, activeHabits) {
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
        consistency: 0,
        progressValue: 0,
      }
      return
    }

    const consistency = computeConsistency(ratios)
    const progressValue = interpolateProgress(consistency, weeksEvaluated)
    const { rank, lp } = progressToRank(progressValue)

    result[key] = {
      rank,
      lp,
      habitId: habit.id,
      habitName: habit.name,
      weeksEvaluated,
      consistency,
      progressValue,
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

export function runRankCalibrationSimulationV3() {
  const weeksCheckpoints = [4, 12, 48, 96, 144, 192, 240]
  const ratios = [0, 0.1, 0.25, 0.5, 0.65, 0.85, 1.0]

  const rows = []
  ratios.forEach((r) => {
    const row = { ratio: r }
    weeksCheckpoints.forEach((w) => {
      const progressValue = interpolateProgress(r, w)
      const { rank, lp } = progressToRank(progressValue)
      row[w] = { rank, lp, progressValue: Math.round(progressValue) }
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

