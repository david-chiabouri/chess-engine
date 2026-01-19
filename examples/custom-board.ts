/**
 * Custom Board Example
 * 
 * Demonstrates creating non-standard board sizes and configurations.
 * This creates a "Pawn Rush" minigame on a 5x6 board.
 */

import { ChessBoard } from '../src/chess-board';
import { ChessEngine } from '../src/chess-engine';
import { ChessNotation } from '../src/chess-notation';
import { PieceType } from '../src/piece-type.enums';

// === Create a 5x6 "Pawn Rush" Board ===
// White: King + 4 Pawns at bottom
// Black: King + 4 Pawns at top
// Goal: Promote a pawn first!

function createPawnRushBoard(): ChessBoard {
    const board = new ChessBoard({ width: 5, height: 6 });

    // Black pieces (top)
    board.setTile(2, 0, PieceType.King, 2);  // King at c6
    for (let x = 0; x < 5; x++) {
        if (x !== 2) board.setTile(x, 1, PieceType.Pawn, 2);  // Pawns on rank 5
    }

    // White pieces (bottom)
    board.setTile(2, 5, PieceType.King, 1);  // King at c1
    for (let x = 0; x < 5; x++) {
        if (x !== 2) board.setTile(x, 4, PieceType.Pawn, 1);  // Pawns on rank 2
    }

    return board;
}

const board = createPawnRushBoard();
let gameState = ChessEngine.newGame(board, [
    { team_identifier: 1, player_identifiers: [1] },
    { team_identifier: 2, player_identifiers: [2] }
]);

console.log("=== Pawn Rush (5x6 Board) ===\n");
console.log("Board dimensions:", board.getWidth(), "x", board.getHeight());
console.log("FEN:", ChessEngine.toFEN(gameState));

// Print the board as ASCII
console.log("\nBoard:");
for (let y = 0; y < 6; y++) {
    let row = `${6 - y} `;
    for (let x = 0; x < 5; x++) {
        const tile = board.getTile(x, y);
        const symbols: Record<number, string> = {
            [PieceType.King]: 'K',
            [PieceType.Pawn]: 'P',
            [PieceType.EmptySquare]: '.',
            [PieceType.None]: '.',
        };
        let sym = symbols[tile.piece] ?? '.';
        if (tile.owner_identifier === 2) sym = sym.toLowerCase();
        row += sym + ' ';
    }
    console.log(row);
}
console.log("  a b c d e\n");

// Make some moves
const moves = ["a3", "a4", "b3", "b4"];
console.log("Playing:", moves.join(", "));

for (const san of moves) {
    try {
        const move = ChessNotation.parseMove(gameState, san);
        gameState = ChessEngine.applyMove(gameState, move);
        console.log(`  ${san} applied`);
    } catch (e: any) {
        console.log(`  ${san} failed: ${e.message}`);
    }
}

console.log("\nFinal FEN:", ChessEngine.toFEN(gameState));
