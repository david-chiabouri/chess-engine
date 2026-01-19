import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface StockfishOptions {
    skillLevel?: number;     // 0-20 (default: 20)
    multiPV?: number;        // 1-5 lines to analyze
    depth?: number;          // Search depth
    movetime?: number;       // Time to search in ms
}

export interface AnalysisResult {
    bestMove: string;        // Best move in UCI format (e.g., "e2e4")
    evaluation: number;      // Evaluation in centipawns (positive = white advantage)
    depth: number;           // Search depth reached
    pv: string[];            // Principal variation (list of moves)
    multiPV?: {              // Additional lines if MultiPV > 1
        move: string;
        score: number;
        pv: string[];
    }[];
}

export class StockfishEngine {
    private worker: Worker | null = null;
    private isReady: boolean = false;
    private messageHandler: (line: string) => void = () => { };

    /**
     * Start the stockfish engine in a worker thread
     */
    public async start(): Promise<void> {
        if (this.worker) return;

        // Path to our dedicated worker
        const workerPath = resolve(dirname(fileURLToPath(import.meta.url)), 'stockfish-worker.ts');

        // console.log(`[Stockfish] Spawning worker: ${workerPath}`);

        // Create a worker that executes our bridge script
        // Bun automatically transpiles the TS worker file
        this.worker = new Worker(workerPath);

        this.worker.onmessage = (event) => {
            const msg = event.data;
            this.handleMessage(typeof msg === 'string' ? msg : msg.toString());
        };

        this.worker.onerror = (error) => {
            console.error('[Stockfish Worker Error]:', error);
        };

        // Initialize UCI
        await this.sendCommandAndWait('uci', 'uciok');
        await this.sendCommandAndWait('isready', 'readyok');
        this.isReady = true;
    }

    /**
     * Stop the stockfish engine
     */
    public stop(): void {
        if (this.worker) {
            this.postMessage('quit');
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
        }
    }

    /**
     * Set engine options
     */
    public async setOptions(options: StockfishOptions): Promise<void> {
        if (!this.worker) return;
        if (options.skillLevel !== undefined) this.postMessage(`setoption name Skill Level value ${options.skillLevel}`);
        if (options.multiPV !== undefined) this.postMessage(`setoption name MultiPV value ${options.multiPV}`);
        await this.sendCommandAndWait('isready', 'readyok');
    }

    /**
     * Set the board position using FEN
     */
    public setPosition(fen: string): void {
        this.postMessage(`position fen ${fen}`);
    }

    public setPositionFromMoves(moves: string[]): void {
        if (moves.length === 0) this.postMessage('position startpos');
        else this.postMessage(`position startpos moves ${moves.join(' ')}`);
    }

    public async getBestMove(options: { depth?: number; movetime?: number } = {}): Promise<AnalysisResult> {
        const searchCmd = options.depth ? `go depth ${options.depth}` : (options.movetime ? `go movetime ${options.movetime}` : 'go depth 15');
        return new Promise((resolve, reject) => {
            const result: AnalysisResult = { bestMove: '', evaluation: 0, depth: 0, pv: [] };
            const timeoutId = setTimeout(() => {
                this.messageHandler = () => { };
                reject(new Error('Stockfish search timeout'));
            }, 30000);

            this.messageHandler = (line: string) => {
                if (line.startsWith('info')) {
                    const depthMatch = line.match(/depth (\d+)/);
                    const scoreMatch = line.match(/score cp (-?\d+)/);
                    if (depthMatch) result.depth = parseInt(depthMatch[1] ?? '0');
                    if (scoreMatch) result.evaluation = parseInt(scoreMatch[1] ?? '0');
                }
                if (line.startsWith('bestmove')) {
                    clearTimeout(timeoutId);
                    result.bestMove = line.match(/bestmove (\S+)/)?.[1] ?? '';
                    this.messageHandler = () => { };
                    resolve(result);
                }
            };

            this.postMessage(searchCmd);
        });
    }

    private postMessage(message: string): void {
        if (this.worker) this.worker.postMessage(message);
    }

    private sendCommandAndWait(command: string, waitFor: string): Promise<void> {
        return new Promise((resolve) => {
            const originalHandler = this.messageHandler;
            this.messageHandler = (line: string) => {
                if (line.includes(waitFor)) {
                    this.messageHandler = originalHandler;
                    resolve();
                }
            };
            this.postMessage(command);
        });
    }

    private handleMessage(data: string): void {
        const lines = data.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) this.messageHandler(trimmed);
        }
    }
}