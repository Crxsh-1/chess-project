export type EngineDifficulty = 'easy' | 'medium' | 'hard'

const searchDepths: Record<EngineDifficulty, number> = {
  easy: 6,
  medium: 10,
  hard: 14,
}

type PendingRequest = {
  id: number
  resolve: (move: string | null) => void
}

export class StockfishEngine {
  private readonly worker: Worker
  private readonly ready: Promise<void>
  private resolveReady: (() => void) | null = null
  private rejectReady: ((reason: Error) => void) | null = null
  private pendingRequest: PendingRequest | null = null
  private requestId = 0

  constructor() {
    this.worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`)
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })
    this.worker.onmessage = (event: MessageEvent<string>) => this.handleMessage(event.data)
    this.worker.onerror = () => {
      const error = new Error('Stockfish worker failed to load')
      this.rejectReady?.(error)
      this.rejectReady = null
      this.pendingRequest?.resolve(null)
      this.pendingRequest = null
    }
    this.worker.postMessage('uci')
  }

  requestMove(fen: string, difficulty: EngineDifficulty): Promise<string | null> {
    this.cancel()
    const id = ++this.requestId

    return this.ready
      .then(() => new Promise<string | null>((resolve) => {
        if (id !== this.requestId) {
          resolve(null)
          return
        }

        this.pendingRequest = { id, resolve }
        this.worker.postMessage(`position fen ${fen}`)
        this.worker.postMessage(`go depth ${searchDepths[difficulty]}`)
      }))
      .catch(() => null)
  }

  cancel() {
    this.requestId += 1
    this.worker.postMessage('stop')
    this.pendingRequest?.resolve(null)
    this.pendingRequest = null
  }

  dispose() {
    this.cancel()
    this.worker.terminate()
  }

  private handleMessage(line: string) {
    if (line === 'uciok') {
      this.worker.postMessage('isready')
      return
    }

    if (line === 'readyok') {
      this.resolveReady?.()
      this.resolveReady = null
      this.rejectReady = null
      return
    }

    if (!line.startsWith('bestmove')) {
      return
    }

    const move = line.split(/\s+/)[1]
    const pendingRequest = this.pendingRequest
    this.pendingRequest = null

    if (pendingRequest?.id === this.requestId) {
      pendingRequest.resolve(move && move !== '(none)' ? move : null)
    }
  }
}
