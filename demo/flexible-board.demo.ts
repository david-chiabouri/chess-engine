
import { ChessBoard } from "../src/chess-board";
import { PieceType } from "../src/piece-type.enums";

// --- Simple Console Renderer ---
const PIECE_SYMBOLS: Record<number, string> = {
    [PieceType.None]: '.',
    [PieceType.EmptySquare]: '.',
    [PieceType.Pawn]: 'P',
    [PieceType.Knight]: 'N',
    [PieceType.Bishop]: 'B',
    [PieceType.Rook]: 'R',
    [PieceType.Queen]: 'Q',
    [PieceType.King]: 'K',
};

function renderBoardToConsole(label: string, board: ChessBoard) {
    console.log(`\n=== ${label} ===`);
    console.log(`Dimensions: ${board.getWidth()}x${board.getHeight()}`);

    for (let y = 0; y < board.getHeight(); y++) {
        let rowStr = `Rank ${y}: `;
        for (let x = 0; x < board.getWidth(); x++) {
            const tile = board.getTile(x, y);

            // Colorize: White=Cyan, Black=Red, Neutral=Gray
            let symbol = PIECE_SYMBOLS[tile.piece] || '?';

            // Simple ANSI colors
            const reset = "\x1b[0m";
            const cyan = "\x1b[36m"; // White (Player 1)
            const red = "\x1b[31m";  // Black (Player 2)
            const gray = "\x1b[90m"; // Neutral/None

            let color = gray;
            if (tile.owner_identifier === 1) color = cyan;
            if (tile.owner_identifier === 2) color = red;

            rowStr += `[${color}${symbol}${reset}]`;
        }
        console.log(rowStr);
    }
}

// --- Scenario 1: Mini 3x3 Board ---
// Demonstrates standard 2D array usage for quick setups
const miniBoard = ChessBoard.fromGrid([
    [PieceType.Rook, PieceType.King, PieceType.Rook],
    [PieceType.Pawn, PieceType.Pawn, PieceType.Pawn],
    [PieceType.EmptySquare, PieceType.EmptySquare, PieceType.EmptySquare]
]);
renderBoardToConsole("Scenario 1: Simple 3x3 Grid", miniBoard);


// --- Scenario 2: Jagged/Flexible Array ---
// Demonstrates that the engine flattens rows, allowing mixed grouping
// Row 0: [Rook, Knight, Bishop] (Grouped)
// Row 1: [Pawn, Pawn, Pawn] (Individual)
const jaggedBoard = ChessBoard.fromGrid([
    [[PieceType.Rook, PieceType.Knight], PieceType.Bishop], // Row 0
    [PieceType.Pawn, PieceType.Pawn, PieceType.Pawn]        // Row 1
]);
renderBoardToConsole("Scenario 2: Jagged Structure (Flattened)", jaggedBoard);


// --- Scenario 3: Complex Configuration with Owners ---
// Demonstrates use of objects to specify ownership
const W = (p: PieceType) => ({ piece: p, owner: 1 }); // White Helper
const B = (p: PieceType) => ({ piece: p, owner: 2 }); // Black Helper

const puzzleBoard = ChessBoard.fromGrid([
    [null, B(PieceType.King), null],
    [null, B(PieceType.Pawn), null],
    [W(PieceType.Rook), null, W(PieceType.King)]
]);
renderBoardToConsole("Scenario 3: Custom Puzzle (White vs Black)", puzzleBoard);

console.log("\nDone.");
