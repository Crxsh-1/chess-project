import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { isHumanTurn, SessionGuard, undoToDecisionPoint } from './gameLogic'
import { StockfishEngine, type EngineDifficulty } from './stockfishEngine'
import './App.css'

type PieceDropArgs = {
  sourceSquare: string
  targetSquare: string | null
}

type CapturedPiece = {
  symbol: string
  name: string
}

type BoardSide = 'white' | 'black'
type SideChoice = BoardSide | 'random'
type GameMode = 'local' | 'stockfish'

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
  const [playerSide, setPlayerSide] = useState<BoardSide>('white')
  const [sideChoice, setSideChoice] = useState<SideChoice>('white')
  const [gameMode, setGameMode] = useState<GameMode>('local')
  const [gameModeChoice, setGameModeChoice] = useState<GameMode>('local')
  const [difficulty, setDifficulty] = useState<EngineDifficulty>('medium')
  const [difficultyChoice, setDifficultyChoice] = useState<EngineDifficulty>('medium')
  const [boardOrientation, setBoardOrientation] = useState<BoardSide>('white')
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [engineError, setEngineError] = useState<string | null>(null)
  const engineRef = useRef<StockfishEngine | null>(null)
  const sessionGuardRef = useRef(new SessionGuard())
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
    if (!targetSquare || isGameOver || isThinking || (isStockfishGame && !isHumanTurn(game, playerSide))) {
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
    sessionGuardRef.current.next()
    engineRef.current?.cancel()
    setIsThinking(false)
    setIsSetupOpen(true)
  }

  const handleUndoMove = () => {
    if (moveHistory.length === 0) {
      return
    }

    const previousGame = undoToDecisionPoint(game, isStockfishGame, isThinking)
    sessionGuardRef.current.next()
    engineRef.current?.cancel()
    setIsThinking(false)
    setGame(previousGame)
  }

  const handleStartGame = () => {
    const selectedSide = sideChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : sideChoice
    sessionGuardRef.current.next()
    engineRef.current?.cancel()
    setIsThinking(false)
    setEngineReady(true)
    setEngineError(null)
    setPlayerSide(selectedSide)
    setBoardOrientation(selectedSide)
    setGameMode(gameModeChoice)
    setDifficulty(difficultyChoice)
    setGame(new Chess())
    setIsSetupOpen(false)
  }

  const status = isCheckmate
    ? `Checkmate - ${turn === 'White' ? 'Black' : 'White'} wins`
    : isStalemate
      ? 'Stalemate - draw'
      : isCheck
        ? `${turn} is in check`
        : `${turn} to move`
  const statusTone = isCheckmate || isStalemate ? 'status-terminal' : isCheck ? 'status-warning' : ''
  const isStockfishGame = gameMode === 'stockfish'
  const displayedStatus = isThinking ? 'Stockfish is thinking...' : status

  useEffect(() => {
    const engine = new StockfishEngine((error) => {
      setEngineError(error.message)
      setEngineReady(false)
      setIsThinking(false)
    })
    engineRef.current = engine
    engine.whenReady()
      .then(() => setEngineReady(true))
      .catch((error: Error) => {
        setEngineError(error.message)
        setEngineReady(false)
        setIsThinking(false)
      })

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!engineReady || isSetupOpen || !isStockfishGame || isGameOver || isHumanTurn(game, playerSide) || !engineRef.current) {
      return
    }

    const engine = engineRef.current
    const session = sessionGuardRef.current.next()
    const position = game.fen()
    let cancelled = false
    setIsThinking(true)

    engine.requestMove(position, difficulty).then((bestMove) => {
      if (cancelled || !sessionGuardRef.current.isCurrent(session)) {
        setIsThinking(false)
        return
      }

      setIsThinking(false)
      if (!bestMove) {
        return
      }

      const nextGame = new Chess(position)
      if (nextGame.isGameOver()) {
        return
      }

      try {
        nextGame.move({
          from: bestMove.slice(0, 2),
          to: bestMove.slice(2, 4),
          promotion: bestMove[4] ?? 'q',
        })
        setGame(nextGame)
      } catch {
        setEngineError('Stockfish returned an unusable move.')
        setIsThinking(false)
      }
    })

    return () => {
      cancelled = true
      engine.cancel()
      setIsThinking(false)
    }
  }, [difficulty, engineReady, game, isGameOver, isSetupOpen, isStockfishGame, playerSide])

  useEffect(() => {
    if (!isSetupOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSetupOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSetupOpen])

  return (
    <main className="app-shell">
      <div className="game-layout">
        <header className="game-header">
          <div>
            <p className="eyebrow">Milestone 04 / Local game</p>
            <h1 id="page-title">The quiet board</h1>
            <p className="header-copy">A considered match between two players at the same board.</p>
          </div>
          <div className="game-actions">
            <button className="secondary-button" type="button" onClick={() => setBoardOrientation((current) => current === 'white' ? 'black' : 'white')}>
              Flip board
            </button>
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
            <div className={`player-card player-black ${playerSide === 'black' ? 'player-selected' : ''}`}>
              <div className="player-mark" aria-hidden="true">B</div>
              <div>
                <p className="player-name">Black</p>
                <p className="player-role">{isStockfishGame && playerSide === 'white' ? 'Stockfish' : 'Second player'}</p>
              </div>
              {turn === 'Black' && !isGameOver && <span className="turn-badge">To move</span>}
            </div>

            <div className="board-frame" aria-label={`${boardOrientation === 'white' ? 'White' : 'Black'} perspective`}>
            <Chessboard
              options={{
                position: game.fen(),
                  boardOrientation,
                onPieceDrop: handlePieceDrop,
                allowDragging: !isGameOver,
                animationDurationInMs: 180,
                boardStyle: { borderRadius: '2px', overflow: 'hidden' },
                darkSquareStyle: { backgroundColor: '#66845a' },
                lightSquareStyle: { backgroundColor: '#f0e3c5' },
              }}
            />
            </div>

            <div className={`player-card player-white ${playerSide === 'white' ? 'player-selected' : ''}`}>
              <div className="player-mark" aria-hidden="true">W</div>
              <div>
                <p className="player-name">White</p>
                <p className="player-role">{isStockfishGame && playerSide === 'black' ? 'Stockfish' : 'First player'}</p>
              </div>
              {turn === 'White' && !isGameOver && <span className="turn-badge">To move</span>}
            </div>
          </div>

          <aside className="game-sidebar" aria-label="Game information">
            <div className={`status-card ${statusTone}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              <div>
                <p className="card-label">Game status</p>
                <p className="game-status">{engineError ?? displayedStatus}</p>
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

      {isSetupOpen && (
        <div className="setup-backdrop">
          <section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
            <div className="setup-heading">
              <div>
                <p className="eyebrow">New game</p>
                <h2 id="setup-title">Choose your side</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setIsSetupOpen(false)} aria-label="Close new game setup">
                ×
              </button>
            </div>
            <p className="setup-copy">Pick a perspective for this local game. You can flip the board at any time.</p>
            <fieldset className="side-options">
              <legend className="setup-legend">Game mode</legend>
              {(['local', 'stockfish'] as const).map((choice) => (
                <label className={`side-option ${gameModeChoice === choice ? 'side-option-selected' : ''}`} key={choice}>
                  <input
                    type="radio"
                    name="game-mode"
                    value={choice}
                    checked={gameModeChoice === choice}
                    onChange={() => setGameModeChoice(choice)}
                  />
                  <span className="side-option-mark" aria-hidden="true">{choice === 'stockfish' ? 'S' : '2P'}</span>
                  <span>
                    <strong>{choice === 'stockfish' ? 'Play Stockfish' : 'Local two-player'}</strong>
                    <small>{choice === 'stockfish' ? 'Face the Stockfish engine' : 'Take turns at the same board'}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="side-options">
              <legend className="setup-legend">Your side</legend>
              {(['white', 'black', 'random'] as const).map((choice) => (
                <label className={`side-option ${sideChoice === choice ? 'side-option-selected' : ''}`} key={choice}>
                  <input
                    type="radio"
                    name="player-side"
                    value={choice}
                    checked={sideChoice === choice}
                    onChange={() => setSideChoice(choice)}
                  />
                  <span className="side-option-mark" aria-hidden="true">{choice === 'random' ? '?' : choice[0].toUpperCase()}</span>
                  <span>
                    <strong>{choice === 'random' ? 'Random side' : `Play as ${choice[0].toUpperCase()}${choice.slice(1)}`}</strong>
                    <small>{choice === 'random' ? 'Let the board choose your perspective' : `Start from the ${choice} side`}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {gameModeChoice === 'stockfish' && (
              <fieldset className="difficulty-options">
                <legend className="setup-legend">Difficulty</legend>
                {(['easy', 'medium', 'hard'] as const).map((choice) => (
                  <label className="difficulty-option" key={choice}>
                    <input
                      type="radio"
                      name="difficulty"
                      value={choice}
                      checked={difficultyChoice === choice}
                      onChange={() => setDifficultyChoice(choice)}
                    />
                    <span>{choice[0].toUpperCase() + choice.slice(1)}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <div className="setup-actions">
              <button className="secondary-button" type="button" onClick={() => setIsSetupOpen(false)}>Cancel</button>
              <button className="new-game-button" type="button" onClick={handleStartGame}>Start game</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App