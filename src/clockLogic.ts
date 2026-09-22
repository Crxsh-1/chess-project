export type ClockSide = 'w' | 'b'
export type TimeControl = 'unlimited' | 1 | 3 | 5 | 10

export type ClockState = {
  timeControl: TimeControl
  whiteMs: number | null
  blackMs: number | null
  activeSide: ClockSide | null
  running: boolean
  timedOutBy: ClockSide | null
  lastUpdatedAt: number | null
}

export const timeControlMinutes: Record<Exclude<TimeControl, 'unlimited'>, number> = {
  1: 1,
  3: 3,
  5: 5,
  10: 10,
}

export function timeControlToMs(timeControl: TimeControl) {
  return timeControl === 'unlimited' ? null : timeControl * 60_000
}

export function createClockState(timeControl: TimeControl): ClockState {
  const initialMs = timeControlToMs(timeControl)
  return {
    timeControl,
    whiteMs: initialMs,
    blackMs: initialMs,
    activeSide: null,
    running: false,
    timedOutBy: null,
    lastUpdatedAt: null,
  }
}

export function startClock(state: ClockState, activeSide: ClockSide, now: number): ClockState {
  if (state.timeControl === 'unlimited' || state.timedOutBy) {
    return { ...state, activeSide: null, running: false, lastUpdatedAt: null }
  }

  return { ...state, activeSide, running: true, lastUpdatedAt: now }
}

export function stopClock(state: ClockState): ClockState {
  return { ...state, activeSide: null, running: false, lastUpdatedAt: null }
}

export function advanceClock(state: ClockState, now: number): ClockState {
  if (!state.running || !state.activeSide || state.lastUpdatedAt === null || state.timeControl === 'unlimited') {
    return state
  }

  const elapsedMs = Math.max(0, now - state.lastUpdatedAt)
  if (elapsedMs === 0) {
    return state
  }

  const key = state.activeSide === 'w' ? 'whiteMs' : 'blackMs'
  const remainingMs = Math.max(0, (state[key] ?? 0) - elapsedMs)
  if (remainingMs === 0) {
    return {
      ...state,
      [key]: 0,
      activeSide: null,
      running: false,
      timedOutBy: state.activeSide,
      lastUpdatedAt: now,
    }
  }

  return { ...state, [key]: remainingMs, lastUpdatedAt: now }
}

export function switchClock(state: ClockState, nextSide: ClockSide, now: number, shouldRun = true): ClockState {
  const advanced = advanceClock(state, now)
  if (advanced.timedOutBy || !shouldRun) {
    return stopClock(advanced)
  }
  return startClock(advanced, nextSide, now)
}

export function resetClock(timeControl: TimeControl, now: number, startingSide: ClockSide | null): ClockState {
  return startingSide ? startClock(createClockState(timeControl), startingSide, now) : createClockState(timeControl)
}

export function restoreClock(snapshot: ClockState): ClockState {
  return { ...snapshot }
}

export function formatClock(ms: number | null) {
  if (ms === null) {
    return 'Unlimited'
  }

  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
