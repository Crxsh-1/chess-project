import { describe, expect, it } from 'vitest'
import {
  advanceClock,
  createClockState,
  formatClock,
  resetClock,
  restoreClock,
  startClock,
  switchClock,
  timeControlToMs,
} from './clockLogic'

describe('clock logic', () => {
  it('keeps Unlimited clocks disabled', () => {
    const state = startClock(createClockState('unlimited'), 'w', 1000)
    expect(advanceClock(state, 61_000)).toEqual(state)
    expect(formatClock(state.whiteMs)).toBe('Unlimited')
  })

  it('maps time controls to their initial milliseconds', () => {
    expect(timeControlToMs('unlimited')).toBeNull()
    expect(timeControlToMs(1)).toBe(60_000)
    expect(timeControlToMs(3)).toBe(180_000)
    expect(timeControlToMs(5)).toBe(300_000)
    expect(timeControlToMs(10)).toBe(600_000)
  })

  it('starts White with the configured time and deducts elapsed time', () => {
    const started = startClock(createClockState(1), 'w', 1000)
    const advanced = advanceClock(started, 2500)

    expect(advanced.whiteMs).toBe(58_500)
    expect(advanced.blackMs).toBe(60_000)
    expect(advanced.activeSide).toBe('w')
  })

  it('switches turns while preserving both remaining times', () => {
    const started = startClock(createClockState(1), 'w', 1000)
    const switched = switchClock(started, 'b', 2500)
    const advanced = advanceClock(switched, 5000)

    expect(switched.whiteMs).toBe(58_500)
    expect(switched.blackMs).toBe(60_000)
    expect(advanced.whiteMs).toBe(58_500)
    expect(advanced.blackMs).toBe(57_500)
    expect(advanced.activeSide).toBe('b')
  })

  it('flags the active side exactly at zero', () => {
    const started = startClock(createClockState(1), 'b', 1000)
    const timedOut = advanceClock(started, 61_000)

    expect(timedOut.blackMs).toBe(0)
    expect(timedOut.timedOutBy).toBe('b')
    expect(timedOut.running).toBe(false)
    expect(timedOut.activeSide).toBeNull()
  })

  it('restores snapshots and resets a new game', () => {
    const started = startClock(createClockState(3), 'w', 1000)
    const advanced = advanceClock(started, 2000)
    const restored = restoreClock(advanced)

    expect(restored).toEqual(advanced)
    expect(resetClock(1, 1000, 'w')).toEqual(startClock(createClockState(1), 'w', 1000))
  })
})
