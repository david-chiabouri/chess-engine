/**
 * Promotion Mini-Game Demo
 * 
 * Board: 5 wide x 8 tall
 * White (attacker): King + 3 Pawns
 * Black (defender): Rook
 * 
 * Goal: Promote the pawns!
 */

import { GameController } from '../src/app/game-controller';
import { ChessBoard } from '../src/chess-board';
import { ChessEngine, type ChessGameState } from '../src/chess-engine';
import { PieceType } from '../src/piece-type.enums';

export class PromotionMinigame extends GameController {
    constructor() {
        super();
        this.inputBox.setLabel(' Promotion Mini-Game: Enter Move (SAN) or "help" ');

        // Override the game state with custom board
        this.gameState = this.createPromotionBoard();
        this.initialGameState = this.gameState;
        this.history = [this.gameState];
    }

    private createPromotionBoard(): ChessGameState {
        // 4 wide x 8 tall board
        const board = new ChessBoard({ width: 4, height: 8 });

        // White pieces (attacker) - bottom of board
        // King at c1 (x=2, y=7)
        board.setTile(1, 7, PieceType.King, 1);

        // 3 Pawns on rank 2 (y=6): b2, c2, d2
        board.setTile(1, 6, PieceType.Pawn, 1); // b2
        board.setTile(2, 6, PieceType.Pawn, 1); // c2
        board.setTile(3, 6, PieceType.Pawn, 1); // d2

        // Black pieces (defender) - top of board
        // Rook at c8 (x=2, y=0)
        board.setTile(1, 0, PieceType.Rook, 2);

        return ChessEngine.newGame(board, [
            { team_identifier: 1, player_identifiers: [1] },
            { team_identifier: 2, player_identifiers: [2] }
        ]);
    }

    protected override handleCommand(cmd: string): void {
        if (this.applyMove(cmd)) {
            this.log(`Move: ${cmd}`);
            const nextPlayer = this.gameState.participants[this.gameState.turn] === 1 ? "White" : "Black";
            this.log(`${nextPlayer} to move.`);
            this.renderBoard();
        }
    }

    protected override showHelp(): void {
        this.log('Promotion Mini-Game');
        this.log('White: King + 3 Pawns. Goal: Promote!');
        this.log('Black: Rook. Goal: Stop promotion!');
        this.log('Commands: undo, restart, help, exit');
    }

    public run(): void {
        this.log("Promotion Mini-Game");
        this.log("White: King (c1) + 3 Pawns (b2, c2, d2)");
        this.log("Black: Rook (c8)");
        this.log("White to move. Try to promote!");
    }
}

// Allow direct execution
if (import.meta.main) {
    const game = new PromotionMinigame();
    game.start();
}
