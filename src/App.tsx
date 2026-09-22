import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import './App.css'

type PieceDropArgs = {
  sourceSquare: string
  targetSquare: string | null
}

function App() {
  const [game, setGame] = useState(() => new Chess())
  const [position, setPosition] = useState(game.fen())
  const [moveHistory, setMoveHistory] = useState<string[]>([])

  const isGameOver = game.isGameOver()
  const isCheckmate = game.isCheckmate()
  const isStalemate = game.isStalemate()
  const isCheck = game.isCheck()
  const turn = game.turn() === 'w' ? 'White' : 'Black'

  const handlePieceDrop = ({ sourceSquare, targetSquare }: PieceDropArgs) => {
    if (!targetSquare || isGameOver) {
      return false
    }

    try {
      game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
    } catch {
      return false
    }

    setPosition(game.fen())
    setMoveHistory(game.history())
    setGame(new Chess(game.fen()))
    return true
  }

  const handleNewGame = () => {
    const newGame = new Chess()
    setGame(newGame)
    setPosition(newGame.fen())
    setMoveHistory([])
  }

  const status = isCheckmate
    ? `Checkmate - ${turn === 'White' ? 'Black' : 'White'} wins`
    : isStalemate
      ? 'Stalemate - draw'
      : isCheck
        ? `${turn} is in check`
        : `${turn} to move`

  return (
    <main className="app-shell">
      <div className="game-layout">
        <header className="game-header">
          <div>
            <p className="eyebrow">Local chess</p>
            <h1 id="page-title">The quiet board</h1>
          </div>
          <button className="new-game-button" type="button" onClick={handleNewGame}>
            New game
          </button>
        </header>

        <section className="game-area" aria-labelledby="page-title">
          <div className="board-frame">
            <Chessboard
              options={{
                position,
                onPieceDrop: handlePieceDrop,
                allowDragging: !isGameOver,
                animationDurationInMs: 180,
                boardStyle: { borderRadius: '2px', overflow: 'hidden' },
                darkSquareStyle: { backgroundColor: '#72945d' },
                lightSquareStyle: { backgroundColor: '#f0e3c5' },
              }}
            />
          </div>

          <aside className="game-sidebar" aria-label="Game information">
            <div className="status-card" role="status" aria-live="polite">
              <span className={`status-dot ${isCheck ? 'status-dot-check' : ''}`} aria-hidden="true" />
              <div>
                <p className="card-label">Game status</p>
                <p className="game-status">{status}</p>
              </div>
            </div>

            <div className="history-card">
              <div className="history-heading">
                <p className="card-label">Move history</p>
                <span>{moveHistory.length} moves</span>
              </div>
              {moveHistory.length > 0 ? (
                <ol className="move-list">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, index) => {
                    const whiteMove = moveHistory[index * 2]
                    const blackMove = moveHistory[index * 2 + 1]

                    return (
                      <li key={`${index + 1}-${whiteMove}`}>
                        <span className="move-number">{index + 1}.</span>
                        <span>{whiteMove}</span>
                        <span>{blackMove ?? '...'}</span>
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="empty-history">Moves will appear here.</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App