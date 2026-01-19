/**
 * Stockfish Engine Wrapper
 * 
 * Uses Bun Worker to run Stockfish WASM in a separate thread.
 * Communicates via UCI protocol.
 */

import { Worker } from 'worker_threads';
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

type MessageHandler = (message: string) => void;

export class StockfishEngine {
    private worker: Worker | null = null;
    private isReady: boolean = false;
    private messageHandler: MessageHandler = () => { };
    private pendingResolvers: ((line: string) => void)[] = [];

    /**
     * Start the stockfish engine in a worker thread
     */
    public async start(): Promise<void> {
        if (this.worker) return;

        // Find the stockfish WASM file in node_modules
        const stockfishPath = require.resolve('stockfish/src/stockfish-nnue-16-single.js');

        // Create a worker that loads stockfish
        this.worker = new Worker(stockfishPath);

        this.worker.on('message', (data: string) => {
            this.handleMessage(data);
        });

        this.worker.on('error', (error) => {
            console.error('[Stockfish Worker Error]:', error);
        });

        this.worker.on('exit', (code) => {
            this.worker = null;
            this.isReady = false;
        });

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

        if (options.skillLevel !== undefined) {
            this.postMessage(`setoption name Skill Level value ${options.skillLevel}`);
        }
        if (options.multiPV !== undefined) {
            this.postMessage(`setoption name MultiPV value ${options.multiPV}`);
        }
        await this.sendCommandAndWait('isready', 'readyok');
    }

    /**
     * Set the board position using FEN
     */
    public setPosition(fen: string): void {
        this.postMessage(`position fen ${fen}`);
    }

    /**
     * Set position from starting position with moves
     */
    public setPositionFromMoves(moves: string[]): void {
        if (moves.length === 0) {
            this.postMessage('position startpos');
        } else {
            this.postMessage(`position startpos moves ${moves.join(' ')}`);
        }
    }

    /**
     * Get the best move for the current position
     */
    public async getBestMove(options: { depth?: number; movetime?: number } = {}): Promise<AnalysisResult> {
        const searchCmd = options.depth
            ? `go depth ${options.depth}`
            : options.movetime
                ? `go movetime ${options.movetime}`
                : 'go depth 15';

        return new Promise((resolve, reject) => {
            const result: AnalysisResult = {
                bestMove: '',
                evaluation: 0,
                depth: 0,
                pv: [],
                multiPV: []
            };

            const timeoutId = setTimeout(() => {
                this.messageHandler = () => { };
                reject(new Error('Stockfish search timeout'));
            }, 30000);

            this.messageHandler = (line: string) => {
                // Parse info lines for evaluation
                if (line.startsWith('info')) {
                    const depthMatch = line.match(/depth (\d+)/);
                    const scoreMatch = line.match(/score cp (-?\d+)/);
                    const mateMatch = line.match(/score mate (-?\d+)/);
                    const pvMatch = line.match(/pv (.+)/);

                    if (depthMatch) result.depth = parseInt(depthMatch[1] ?? '0');
                    if (scoreMatch) result.evaluation = parseInt(scoreMatch[1] ?? '0');
                    if (mateMatch) {
                        const mateIn = parseInt(mateMatch[1] ?? '0');
                        result.evaluation = mateIn > 0 ? 10000 : -10000;
                    }
                    if (pvMatch) result.pv = pvMatch[1]?.split(' ') ?? [];
                }

                // Parse bestmove
                if (line.startsWith('bestmove')) {
                    clearTimeout(timeoutId);
                    const moveMatch = line.match(/bestmove (\S+)/);
                    if (moveMatch) {
                        result.bestMove = moveMatch[1] ?? '';
                    }
                    this.messageHandler = () => { };
                    resolve(result);
                }
            };

            this.postMessage(searchCmd);
        });
    }

    /**
     * Post a message to the worker
     */
    private postMessage(message: string): void {
        if (this.worker) {
            this.worker.postMessage(message);
        }
    }

    /**
     * Send a command and wait for a specific response
     */
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

    /**
     * Handle messages from the worker
     */
    private handleMessage(data: string): void {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                this.messageHandler(trimmed);
            }
        }
    }
}
