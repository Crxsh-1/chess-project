import { Chess } from 'chess.js'
import type { EngineDifficulty } from './stockfishEngine'

export const searchDepths: Record<EngineDifficulty, number> = {
  easy: 6,
  medium: 10,
  hard: 14,
}

export function isHumanTurn(game: Chess, playerSide: 'white' | 'black') {
  return game.turn() === (playerSide === 'white' ? 'w' : 'b')
}

export function undoToDecisionPoint(game: Chess, isStockfishGame: boolean, isThinking: boolean) {
  const history = game.history()
  const movesToKeep = Math.max(0, history.length - (isStockfishGame && !isThinking ? 2 : 1))
  const previousGame = new Chess()

  for (const move of history.slice(0, movesToKeep)) {
    previousGame.move(move)
  }

  return previousGame
}

export class SessionGuard {
  private currentSession = 0

  next() {
    this.currentSession += 1
    return this.currentSession
  }

  isCurrent(session: number) {
    return session === this.currentSession
  }
}
