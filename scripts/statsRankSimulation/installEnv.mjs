/**
 * Dev-only: MUST be imported before any module that uses getNow() / localStorage.
 * Fixes virtual "today" for deterministic Stats (getWeekStartKey) and Rank.
 */
const SIM_END = new Date('2030-06-06T12:00:00') // Friday — current week Mon Jun 3 – Sun Jun 9, 2030

const RealDate = globalThis.Date

globalThis.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(SIM_END.getTime())
    } else {
      super(...args)
    }
  }

  static now() {
    return SIM_END.getTime()
  }
}

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  },
}

export const SIMULATION_END = SIM_END
export const SIMULATION_END_DATE_STR = (() => {
  const d = SIM_END
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})()
