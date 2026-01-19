import { GameController } from './game-controller';
// The following imports are no longer directly used in GameReplay as GameController handles the underlying chess logic.
// import { ChessEngine, type ChessGameState } from '../chess-engine';
// import { ChessNotation } from '../chess-notation';
// import { PieceType } from '../piece-type.enums';
// import { ChessBoard } from '../chess-board';

export class GameReplay extends GameController {
    private moves: string[];
    private currentIndex: number = 0;
    private isPlaying: boolean = false;
    private playInterval: ReturnType<typeof setInterval> | null = null;

    constructor(moves: string[]) {
        super();
        this.moves = moves;
        // Label the input box
        this.inputBox.setLabel(' Controls: next, prev, play, pause, restart, exit ');
        // initialGameState and history are now managed by GameController
    }

    protected override handleCommand(cmd: string): void {
        const command = cmd.toLowerCase().trim();

        if (command === 'next' || command === 'n') {
            this.stopAutoPlay();
            this.stepForward();
        } else if (command === 'prev' || command === 'p' || command === 'back') {
            this.stopAutoPlay();
            this.stepBackward();
        } else if (command === 'play' || command === 'start') {
            this.startAutoPlay();
        } else if (command === 'pause' || command === 'stop') {
            this.stopAutoPlay();
        } else {
            this.log(`Unknown command: ${cmd}`);
        }
    }

    protected override showHelp(): void {
        this.log('Commands: next, prev, play, pause, restart, undo, exit');
    }

    public run(): void {
        this.log("Game Replay Loaded.");
        this.log(`Loaded ${this.moves.length} moves.`);
        this.log("Type 'play' to start or use 'next'/'prev'.");
    }

    private stepForward() {
        if (this.currentIndex >= this.moves.length) {
            this.log("End of game.");
            this.stopAutoPlay();
            return;
        }

        const san = this.moves[this.currentIndex];
        if (!san) return;

        // Use the applyMove method from GameController
        if (this.applyMove(san)) {
            this.currentIndex++;
            this.log(`[${this.currentIndex}] ${san}`);
            this.renderBoard();
        } else {
            // If applyMove fails (e.g., invalid move), stop auto-play
            this.stopAutoPlay();
        }
    }

    private stepBackward() {
        if (this.currentIndex <= 0) {
            this.log("Start of game.");
            return;
        }

        // Use the undo method from GameController
        this.undo();
        this.currentIndex--;
    }

    private startAutoPlay() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.log("Auto-playing...");
        this.playInterval = setInterval(() => {
            this.stepForward();
        }, 1888);
    }

    private stopAutoPlay() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.log("Paused.");
    }
}
