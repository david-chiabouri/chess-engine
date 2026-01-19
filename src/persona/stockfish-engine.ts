/**
 * Stockfish Engine Wrapper
 * 
 * Manages communication with the stockfish.js engine via UCI protocol.
 */

import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';

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
    private process: ChildProcess | null = null;
    private isReady: boolean = false;
    private outputBuffer: string = '';
    private resolvers: Map<string, (value: string) => void> = new Map();

    /**
     * Start the stockfish engine process
     */
    public async start(): Promise<void> {
        if (this.process) return;

        // Use the stockfish binary from node_modules
        const stockfishPath = require.resolve('stockfish/src/stockfish-nnue-16.js');

        this.process = spawn('node', [stockfishPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout?.on('data', (data: Buffer) => {
            this.handleOutput(data.toString());
        });

        this.process.stderr?.on('data', (data: Buffer) => {
            console.error('[Stockfish Error]:', data.toString());
        });

        this.process.on('close', () => {
            this.process = null;
            this.isReady = false;
        });

        // Initialize UCI
        await this.sendCommand('uci', 'uciok');
        await this.sendCommand('isready', 'readyok');
        this.isReady = true;
    }

    /**
     * Stop the stockfish engine
     */
    public stop(): void {
        if (this.process) {
            this.sendRaw('quit');
            this.process.kill();
            this.process = null;
            this.isReady = false;
        }
    }

    /**
     * Set engine options
     */
    public async setOptions(options: StockfishOptions): Promise<void> {
        if (options.skillLevel !== undefined) {
            this.sendRaw(`setoption name Skill Level value ${options.skillLevel}`);
        }
        if (options.multiPV !== undefined) {
            this.sendRaw(`setoption name MultiPV value ${options.multiPV}`);
        }
        await this.sendCommand('isready', 'readyok');
    }

    /**
     * Set the board position using FEN
     */
    public setPosition(fen: string): void {
        this.sendRaw(`position fen ${fen}`);
    }

    /**
     * Set position from starting position with moves
     */
    public setPositionFromMoves(moves: string[]): void {
        if (moves.length === 0) {
            this.sendRaw('position startpos');
        } else {
            this.sendRaw(`position startpos moves ${moves.join(' ')}`);
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
            let result: Partial<AnalysisResult> = {
                bestMove: '',
                evaluation: 0,
                depth: 0,
                pv: [],
                multiPV: []
            };

            const handleLine = (line: string) => {
                // Parse info lines for evaluation
                if (line.startsWith('info')) {
                    const depthMatch = line.match(/depth (\d+)/);
                    const scoreMatch = line.match(/score cp (-?\d+)/);
                    const mateMatch = line.match(/score mate (-?\d+)/);
                    const pvMatch = line.match(/pv (.+)/);

                    if (depthMatch) result.depth = parseInt(depthMatch[1] ?? '0');
                    if (scoreMatch) result.evaluation = parseInt(scoreMatch[1] ?? '0');
                    if (mateMatch) result.evaluation = parseInt(mateMatch[1] ?? '0') > 0 ? 10000 : -10000;
                    if (pvMatch) result.pv = pvMatch[1]?.split(' ') ?? [];
                }

                // Parse bestmove
                if (line.startsWith('bestmove')) {
                    const moveMatch = line.match(/bestmove (\S+)/);
                    if (moveMatch) {
                        result.bestMove = moveMatch[1];
                    }
                    resolve(result as AnalysisResult);
                }
            };

            // Set up temporary listener
            const originalHandler = this.handleOutput.bind(this);
            this.handleOutput = (data: string) => {
                const lines = data.split('\n');
                for (const line of lines) {
                    if (line.trim()) handleLine(line.trim());
                }
            };

            this.sendRaw(searchCmd);

            // Timeout after 30 seconds
            setTimeout(() => {
                this.handleOutput = originalHandler;
                reject(new Error('Stockfish search timeout'));
            }, 30000);
        });
    }

    /**
     * Send a raw UCI command
     */
    private sendRaw(command: string): void {
        if (this.process?.stdin) {
            this.process.stdin.write(command + '\n');
        }
    }

    /**
     * Send a command and wait for a specific response
     */
    private sendCommand(command: string, waitFor: string): Promise<string> {
        return new Promise((resolve) => {
            const buffer: string[] = [];

            const checkOutput = (data: string) => {
                buffer.push(data);
                if (data.includes(waitFor)) {
                    resolve(buffer.join('\n'));
                }
            };

            const originalHandler = this.handleOutput.bind(this);
            this.handleOutput = (data: string) => {
                checkOutput(data);
            };

            this.sendRaw(command);
        });
    }

    /**
     * Handle stdout output from stockfish
     */
    private handleOutput(data: string): void {
        this.outputBuffer += data;
    }
}
