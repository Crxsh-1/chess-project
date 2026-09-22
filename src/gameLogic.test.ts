import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { isHumanTurn, searchDepths, SessionGuard, undoToDecisionPoint } from './gameLogic'

describe('game logic helpers', () => {
  it('detects human turns from the selected side', () => {
    const game = new Chess()

    expect(isHumanTurn(game, 'white')).toBe(true)
    expect(isHumanTurn(game, 'black')).toBe(false)

    game.move('e4')
    expect(isHumanTurn(game, 'black')).toBe(true)
  })

  it('recognizes terminal positions through chess.js', () => {
    const checkmate = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')
    const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')

    expect(checkmate.isCheckmate()).toBe(true)
    expect(checkmate.isGameOver()).toBe(true)
    expect(stalemate.isStalemate()).toBe(true)
    expect(stalemate.isGameOver()).toBe(true)
  })

  it('undoes a pending human move while the engine is thinking', () => {
    const game = new Chess()
    game.move('e4')

    const restored = undoToDecisionPoint(game, true, true)

    expect(restored.fen()).toBe(new Chess().fen())
    expect(restored.history()).toEqual([])
  })

  it('undoes the AI and preceding human move after an AI response', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')

    const restored = undoToDecisionPoint(game, true, false)

    expect(restored.fen()).toBe(new Chess().fen())
    expect(restored.history()).toEqual([])
  })

  it('preserves ordinary local-game undo behavior', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')

    const restored = undoToDecisionPoint(game, false, false)

    expect(restored.history()).toEqual(['e4'])
  })

  it('invalidates older sessions', () => {
    const guard = new SessionGuard()
    const first = guard.next()
    const second = guard.next()

    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
  })

  it('keeps the configured Stockfish search depths stable', () => {
    expect(searchDepths).toEqual({ easy: 6, medium: 10, hard: 14 })
  })
})