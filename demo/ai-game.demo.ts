/**
 * AI Game Demo - Play against a PersonaAI
 */

import { GameController } from '../src/app/game-controller';
import { ChessEngine } from '../src/chess-engine';
import { ChessNotation } from '../src/chess-notation';
import { PersonaAI, AGGRESSIVE_AI, CAUTIOUS_AI, CHAOTIC_AI, BALANCED_AI } from '../src/persona/persona-ai';

export class AIGameDemo extends GameController {
    private ai: PersonaAI;
    private playerColor: 1 | 2 = 1; // Player is White

    constructor(ai: PersonaAI = BALANCED_AI) {
        super();
        this.ai = ai;
        this.inputBox.setLabel(` Play vs ${ai.name} AI - Enter Move (SAN) `);
    }

    protected override handleCommand(cmd: string): void {
        // Try to apply as a move
        if (this.applyMove(cmd)) {
            this.log(`You: ${cmd}`);
            this.renderBoard();

            // Check if game over
            if (this.isGameOver()) {
                this.log("Game Over!");
                return;
            }

            // AI's turn
            this.makeAIMove();
        }
    }

    protected override showHelp(): void {
        this.log(`Playing against ${this.ai.getPersonaName()} AI`);
        this.log('Enter moves in SAN. Commands: undo, restart, help, exit');
    }

    public async run(): Promise<void> {
        this.log(`Playing against ${this.ai.getPersonaName()} AI`);
        this.log("You are White. Enter a move to start.");

        try {
            await this.ai.initialize();
            this.log("AI ready.");
        } catch (e: any) {
            this.log(`AI init error: ${e.message}`);
        }
    }

    private async makeAIMove(): Promise<void> {
        this.log("AI thinking...");

        try {
            // Convert game state to FEN using ChessEngine
            const fen = ChessEngine.toFEN(this.gameState);
            const uciMove = await this.ai.getBestMove(fen);

            // Convert UCI move to ChessBoardMove and apply
            const move = ChessEngine.uciToMove(uciMove);
            const newState = ChessEngine.applyMove(this.gameState, move);
            this.gameState = newState;
            this.history.push(newState);

            // Convert to SAN for display
            const sanMove = ChessNotation.moveToSAN(move, this.gameState);
            this.log(`AI: ${sanMove}`);
            this.renderBoard();
        } catch (e: any) {
            this.log(`AI error: ${e.message}`);
        }
    }

    private isGameOver(): boolean {
        // TODO: Check for checkmate/stalemate
        return false;
    }

    public override async start(): Promise<void> {
        this.renderBoard();
        this.log("Game Started.");
        await this.run();
        this.inputBox.focus();
        this.screen.render();
    }
}

// Allow direct execution with persona selection
if (import.meta.main) {
    const args = process.argv.slice(2);
    const personaName = args[0]?.toLowerCase() ?? 'balanced';

    let ai: PersonaAI;
    switch (personaName) {
        case 'aggressive': ai = AGGRESSIVE_AI; break;
        case 'cautious': ai = CAUTIOUS_AI; break;
        case 'chaotic': ai = CHAOTIC_AI; break;
        default: ai = BALANCED_AI;
    }

    const game = new AIGameDemo(ai);
    game.start();
}

