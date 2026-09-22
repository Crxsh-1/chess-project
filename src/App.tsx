import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import './App.css'

type PieceDropArgs = {
  sourceSquare: string
  targetSquare: string | null
}

type CapturedPiece = {
  symbol: string
  name: string
}

const pieceNames: Record<string, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
}

function App() {
  const [game, setGame] = useState(() => new Chess())
  const isGameOver = game.isGameOver()
  const isCheckmate = game.isCheckmate()
  const isStalemate = game.isStalemate()
  const isCheck = game.isCheck()
  const turn = game.turn() === 'w' ? 'White' : 'Black'
  const moveHistory = game.history()
  const verboseHistory = game.history({ verbose: true })
  const capturedPieces = useMemo(() => {
    const capturedByWhite: CapturedPiece[] = []
    const capturedByBlack: CapturedPiece[] = []

    verboseHistory.forEach((move) => {
      if (!move.captured) {
        return
      }

      const capturedPiece = {
        symbol: move.captured.toUpperCase(),
        name: pieceNames[move.captured],
      }

      if (move.color === 'w') {
        capturedByWhite.push(capturedPiece)
      } else {
        capturedByBlack.push(capturedPiece)
      }
    })

    return { capturedByWhite, capturedByBlack }
  }, [game])

  const handlePieceDrop = ({ sourceSquare, targetSquare }: PieceDropArgs) => {
    if (!targetSquare || isGameOver) {
      return false
    }

    const nextGame = new Chess(game.fen())

    try {
      nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
    } catch {
      return false
    }

    setGame(nextGame)
    return true
  }

  const handleNewGame = () => {
    setGame(new Chess())
  }

  const handleUndoMove = () => {
    if (moveHistory.length === 0) {
      return
    }

    const previousGame = new Chess(game.fen())
    previousGame.undo()
    setGame(previousGame)
  }

  const status = isCheckmate
    ? `Checkmate - ${turn === 'White' ? 'Black' : 'White'} wins`
    : isStalemate
      ? 'Stalemate - draw'
      : isCheck
        ? `${turn} is in check`
        : `${turn} to move`
  const statusTone = isCheckmate || isStalemate ? 'status-terminal' : isCheck ? 'status-warning' : ''

  return (
    <main className="app-shell">
      <div className="game-layout">
        <header className="game-header">
          <div>
            <p className="eyebrow">Milestone 02 / Local game</p>
            <h1 id="page-title">The quiet board</h1>
            <p className="header-copy">A considered match between two players at the same board.</p>
          </div>
          <div className="game-actions">
            <button className="secondary-button" type="button" onClick={handleUndoMove} disabled={moveHistory.length === 0}>
              Undo move
            </button>
            <button className="new-game-button" type="button" onClick={handleNewGame}>
              New game
            </button>
          </div>
        </header>

        <section className="game-area" aria-labelledby="page-title">
          <div className="board-column">
            <div className="player-card player-black">
              <div className="player-mark" aria-hidden="true">B</div>
              <div>
                <p className="player-name">Black</p>
                <p className="player-role">Second player</p>
              </div>
              {turn === 'Black' && !isGameOver && <span className="turn-badge">To move</span>}
            </div>

            <div className="board-frame">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: handlePieceDrop,
                allowDragging: !isGameOver,
                animationDurationInMs: 180,
                boardStyle: { borderRadius: '2px', overflow: 'hidden' },
                darkSquareStyle: { backgroundColor: '#66845a' },
                lightSquareStyle: { backgroundColor: '#f0e3c5' },
              }}
            />
            </div>

            <div className="player-card player-white">
              <div className="player-mark" aria-hidden="true">W</div>
              <div>
                <p className="player-name">White</p>
                <p className="player-role">First player</p>
              </div>
              {turn === 'White' && !isGameOver && <span className="turn-badge">To move</span>}
            </div>
          </div>

          <aside className="game-sidebar" aria-label="Game information">
            <div className={`status-card ${statusTone}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
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

            <div className="captured-card">
              <div className="history-heading">
                <p className="card-label">Captured pieces</p>
              </div>
              <div className="capture-row">
                <span className="capture-label">White</span>
                <div className="captured-pieces" aria-label="Pieces captured by White">
                  {capturedPieces.capturedByWhite.length > 0 ? capturedPieces.capturedByWhite.map((piece, index) => (
                    <span className="captured-piece captured-black-piece" key={`${piece.name}-${index}`} title={piece.name}>
                      {piece.symbol}
                    </span>
                  )) : <span className="no-captures">None</span>}
                </div>
              </div>
              <div className="capture-row">
                <span className="capture-label">Black</span>
                <div className="captured-pieces" aria-label="Pieces captured by Black">
                  {capturedPieces.capturedByBlack.length > 0 ? capturedPieces.capturedByBlack.map((piece, index) => (
                    <span className="captured-piece captured-white-piece" key={`${piece.name}-${index}`} title={piece.name}>
                      {piece.symbol}
                    </span>
                  )) : <span className="no-captures">None</span>}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App