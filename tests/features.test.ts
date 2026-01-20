
import { describe, expect, test } from "bun:test";
import { ChessBoard } from "../src/chess-board";
import { ChessEngine } from "../src/chess-engine";
import { PieceType } from "../src/piece-type.enums";
import { ChessNotation } from "../src/chess-notation";


describe("Supported Features Verification", () => {

    test("Feature: Custom Board Size", () => {
        // create 5x5 board
        const board = new ChessBoard({ width: 5, height: 5 });
        expect(board.getWidth()).toBe(5);
        expect(board.getHeight()).toBe(5);

        board.setTile(4, 4, PieceType.King, 1);
        const tile = board.getTile(4, 4);
        expect(tile.piece).toBe(PieceType.King);
    });

    test("Feature: FEN Generation", () => {
        // Standard starting position (roughly)
        const board = new ChessBoard({ width: 8, height: 8 });

        // White pieces
        board.setTile(0, 0, PieceType.Rook, 1);
        board.setTile(4, 0, PieceType.King, 1);

        // Black pieces
        board.setTile(4, 7, PieceType.King, 2);

        const state = ChessEngine.newGame(board, [
            { team_identifier: 1, player_identifiers: [1] },
            { team_identifier: 2, player_identifiers: [2] }
        ]);

        const fen = ChessEngine.toFEN(state);
        // Expected: 4k3/8/8/8/8/8/8/R3K3 w Kkq - 0 1
        // (Note: empty castling rights might differ depending on default map. The generic newGame sets empty rights).

        // Our newGame initializes empty map, so rights are '-'.
        // Rows reverse order usually in FEN (rank 8 first). 
        // Our engine loops y=0 to height. Standard chess is y=0 = rank 1? 
        // Usually y=0 is top-left in computer graphics (Rank 8), but bottom-left in Math.
        // Let's check implementation behavior via test.

        // The implementation:
        // rows.push(row) for y=0..height.
        // So y=0 is the first line of FEN.
        // Standard FEN: Rank 8 first. 
        // If y=0 is Rank 8 (Top), then R3K3 should be last.
        // If y=0 is Rank 1 (Bottom), then R3K3 should be first.

        // We need to know coordinate system.
        // In toFEN:
        // for (let y = 0...
        // ...
        // enPassant: rank = height - y.
        // If y=0, rank = 8. So y=0 IS Rank 8 (Top).

        // So:
        // y=0 (Rank 8): Black King at 4,7?
        // Wait. If y=0 is Rank 8, then (4,7) is y=7. That is Rank 1.
        // So Black King is at Rank 1?

        // Let's re-read the setup.
        // board.setTile(4, 7, PieceType.King, 2); -> y=7.
        // If y=0 is Rank 8, then y=7 is Rank 1.
        // So Black King is at bottom. White King (4,0) is at Top.
        // That's inverted for standard chess (White at bottom/rank 1).

        // NOTE: This usually implies y=0 is Rank 1 in this engine?
        // Let's check toFEN logic again.
        // `const rank = height - gameState.enPassantTarget.y;`
        // If y=0, rank=8. So y=0 is the "8th rank".
        // If I put White King at (4,0), I'm putting him on the 8th rank.

        // Setup correction for standard chess expectation:
        // White pieces at y=7 (Rank 1). Black at y=0 (Rank 8).
        // Let's adjust test to match standard FEN expectation.
    });

    test("Feature: Standard Chess FEN", () => {
        const board = new ChessBoard({ width: 8, height: 8 });
        // White Rank 1 (y=7)
        board.setTile(4, 7, PieceType.King, 1);

        // Black Rank 8 (y=0)
        board.setTile(4, 0, PieceType.King, 2);

        const state = ChessEngine.newGame(board, []);
        state.participants = [1, 2];
        state.turn = 0; // White to move

        const fen = ChessEngine.toFEN(state);
        // y=0: 4K3 (BUT Owner 2 is Black -> 'k') -> 4k3
        // ...
        // y=7: 4K3 (Owner 1 is White -> 'K') -> 4K3

        // Output: "4k3/8/8/8/8/8/8/4K3 w - - 0 1"
        expect(fen).toBe("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    });

    test("Feature: Flexible Board Creation (Array Flattening)", () => {
        // [ [Row 0 Content], [Row 1 Content] ]
        // Row 0: [Rook, [King, Rook]] -> Flattens to [Rook, King, Rook]
        // Row 1: Pawn                -> Flattens to [Pawn]

        const board = ChessBoard.fromGrid([
            [PieceType.Rook, [PieceType.King, PieceType.Rook]],
            PieceType.Pawn
        ]);

        // Expected Dimensions:
        // Height: 2 (Top-level array has 2 elements)
        // Width: 3 (Row 0 has length 3, Row 1 has length 1. Max is 3).
        expect(board.getWidth()).toBe(3);
        expect(board.getHeight()).toBe(2);

        // Verify Row 0
        expect(board.getTile(0, 0).piece).toBe(PieceType.Rook);
        expect(board.getTile(1, 0).piece).toBe(PieceType.King);
        expect(board.getTile(2, 0).piece).toBe(PieceType.Rook);

        // Verify Row 1
        expect(board.getTile(0, 1).piece).toBe(PieceType.Pawn);
        expect(board.getTile(1, 1).piece).toBe(PieceType.EmptySquare); // Pad
    });
});
