import { ChessTui } from './app';
import { ChessEngine, type ChessGameState } from '../chess-engine';
import { ChessNotation } from '../chess-notation';

/**
 * Abstract GameController providing common game state management.
 * Subclasses implement handleCommand() for mode-specific behavior.
 */
export abstract class GameController extends ChessTui {
    protected history: ChessGameState[] = [];
    protected initialGameState: ChessGameState;

    constructor() {
        super();
        this.initialGameState = this.gameState;
        this.history.push(this.gameState);
    }

    protected override onCommand(cmd: string): void {
        const command = cmd.toLowerCase().trim();

        // Common commands
        if (command === 'help') {
            this.showHelp();
            return;
        }
        if (command === 'undo' || command === 'u') {
            this.undo();
            return;
        }
        if (command === 'restart' || command === 'reset') {
            this.resetGame();
            return;
        }

        // Delegate to subclass
        this.handleCommand(cmd);
    }

    /**
     * Subclass-specific command handling.
     * Return true if the command was handled.
     */
    protected abstract handleCommand(cmd: string): void;

    /**
     * Show help text (override in subclass for custom help).
     */
    protected showHelp(): void {
        this.log('Commands: undo, restart, help, exit');
    }

    /**
     * Apply a move in SAN notation to the current game state.
     */
    protected applyMove(san: string): boolean {
        try {
            const move = ChessNotation.parseMove(this.gameState, san);
            const newState = ChessEngine.applyMove(this.gameState, move);
            this.history.push(newState);
            this.gameState = newState;
            return true;
        } catch (e: any) {
            this.log(`Error: ${e.message}`);
            return false;
        }
    }

    /**
     * Undo the last move.
     */
    protected undo(): void {
        if (this.history.length <= 1) {
            this.log("Nothing to undo.");
            return;
        }
        this.history.pop();
        const previousState = this.history[this.history.length - 1];
        if (previousState) {
            this.gameState = previousState;
            this.log("Move undone.");
            this.renderBoard();
        }
    }

    /**
     * Reset the game to the initial state.
     */
    protected resetGame(): void {
        this.history = [this.initialGameState];
        this.gameState = this.initialGameState;
        this.renderBoard();
        this.log("Game reset.");
    }
}
