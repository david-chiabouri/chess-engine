/**
 * Basic Game Example
 * 
 * Demonstrates how to set up a standard chess game, make moves,
 * and inspect the game state programmatically.
 */

import { ChessBoard } from '../src/chess-board';
import { ChessEngine } from '../src/chess-engine';
import { ChessNotation } from '../src/chess-notation';
import { PieceType } from '../src/piece-type.enums';

// === 1. Create a Standard 8x8 Board ===
function createStandardBoard(): ChessBoard {
    const board = new ChessBoard({ width: 8, height: 8 });

    // Helper to set up a row
    const setupRow = (y: number, owner: number, pieces: PieceType[]) => {
        pieces.forEach((piece, x) => board.setTile(x, y, piece, owner));
    };

    // Back rank pieces
    const backRank = [
        PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen,
        PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook
    ];
    const pawns = Array(8).fill(PieceType.Pawn);

    // Black pieces (top, y=0 and y=1)
    setupRow(0, 2, backRank);
    setupRow(1, 2, pawns);

    // White pieces (bottom, y=6 and y=7)
    setupRow(6, 1, pawns);
    setupRow(7, 1, backRank);

    return board;
}

// === 2. Initialize Game State ===
const board = createStandardBoard();
let gameState = ChessEngine.newGame(board, [
    { team_identifier: 1, player_identifiers: [1] },  // White
    { team_identifier: 2, player_identifiers: [2] }   // Black
]);

console.log("=== Basic Chess Game Example ===\n");
console.log("Initial FEN:", ChessEngine.toFEN(gameState));

// === 3. Make Some Moves Using SAN ===
const moves = ["e4", "e5", "Nf3", "Nc6", "Bb5"];

console.log("\nPlaying moves:", moves.join(", "));

for (const san of moves) {
    try {
        const move = ChessNotation.parseMove(gameState, san);
        gameState = ChessEngine.applyMove(gameState, move);
        console.log(`  ${san} -> OK`);
    } catch (e: any) {
        console.log(`  ${san} -> Error: ${e.message}`);
    }
}

console.log("\nFinal FEN:", ChessEngine.toFEN(gameState));
console.log("Move count:", gameState.moveHistory.length);
console.log("Current turn:", gameState.participants[gameState.turn] === 1 ? "White" : "Black");

// === 4. Check a Specific Tile ===
const e4Tile = board.getTile(4, 4);  // e4 after the moves
console.log("\nTile at e4:", {
    piece: e4Tile.piece,
    owner: e4Tile.owner_identifier
});

// === 5. Validate a Move ===
const isValid = ChessEngine.isValidMove(gameState, 0, 6, 0, 4);  // a2 to a4
console.log("\nIs a2-a4 valid for Black?", isValid);
