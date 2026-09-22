import { searchDepths } from './gameLogic'

export type EngineDifficulty = 'easy' | 'medium' | 'hard'

type PendingRequest = {
  id: number
  resolve: (move: string | null) => void
}

export class StockfishEngine {
  private worker: Worker | null = null
  private ready: Promise<void> = Promise.resolve()
  private resolveReady: (() => void) | null = null
  private rejectReady: ((reason: Error) => void) | null = null
  private pendingRequest: PendingRequest | null = null
  private requestId = 0
  private error: Error | null = null

  constructor(private readonly onError?: (error: Error) => void) {
    this.startWorker()
  }

  private startWorker() {
    const worker = new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`)
    this.worker = worker
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })
    worker.onmessage = (event: MessageEvent<string>) => this.handleMessage(event.data)
    worker.onerror = () => {
      const error = new Error('Stockfish worker failed to load')
      this.error = error
      this.rejectReady?.(error)
      this.rejectReady = null
      this.pendingRequest?.resolve(null)
      this.pendingRequest = null
      this.onError?.(error)
    }
    worker.postMessage('uci')
  }

  requestMove(fen: string, difficulty: EngineDifficulty): Promise<string | null> {
    this.cancel()
    this.error = null
    this.startWorker()
    const id = ++this.requestId

    return this.ready
      .then(() => new Promise<string | null>((resolve) => {
        if (id !== this.requestId) {
          resolve(null)
          return
        }

        this.pendingRequest = { id, resolve }
        this.worker?.postMessage(`position fen ${fen}`)
        this.worker?.postMessage(`go depth ${searchDepths[difficulty]}`)
      }))
      .catch(() => null)
  }

  whenReady() {
    return this.ready
  }

  getError() {
    return this.error
  }

  cancel() {
    this.requestId += 1
    this.worker?.postMessage('stop')
    this.pendingRequest?.resolve(null)
    this.pendingRequest = null
    this.worker?.terminate()
    this.worker = null
  }

  dispose() {
    this.cancel()
  }

  private handleMessage(line: string) {
    if (line === 'uciok') {
      this.worker?.postMessage('isready')
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
