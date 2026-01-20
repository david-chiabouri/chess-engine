
import { describe, expect, test } from "bun:test";
import { ChessBoard } from "../src/chess-board";
import { ChessEngine, type ChessGameState, type ChessBoardMove } from "../src/chess-engine";
import { PieceType } from "../src/piece-type.enums";

describe("Fixed Compliance Tests", () => {

    const createGameState = (board: ChessBoard): ChessGameState => {
        return {
            board,
            turn: 0,
            participants: [1, 2],
            teams: [],
            castlingRights: new Map([
                [1, { kingSide: true, queenSide: true }],
                [2, { kingSide: true, queenSide: true }]
            ]),
            enPassantTarget: null,
            moveHistory: []
        };
    };

    test("COMPLIANCE: Castling Through Check IS prevented", () => {
        // Setup: White King at 4,0. White Rook at 7,0.
        // Black Rook at 5,7, attacking 5,0 (the square the King crosses).
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(4, 0, PieceType.King, 1);
        board.setTile(7, 0, PieceType.Rook, 1);
        board.setTile(5, 7, PieceType.Rook, 2); // Attacks file 5

        const state = createGameState(board);
        state.turn = 0; // White's turn

        const isCastlingValid = ChessEngine.isValidMove(state, 4, 0, 6, 0); // KingSide Castle

        expect(isCastlingValid).toBe(false);
    });

    test("COMPLIANCE: Castling Out of Check IS prevented", () => {
        // Setup: White King at 4,0. Black Rook at 4,7 (Attacking King).
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(4, 0, PieceType.King, 1);
        board.setTile(7, 0, PieceType.Rook, 1);
        board.setTile(4, 7, PieceType.Rook, 2); // Checks King

        const state = createGameState(board);
        state.turn = 0;

        const isCastlingValid = ChessEngine.isValidMove(state, 4, 0, 6, 0);

        expect(isCastlingValid).toBe(false);
    });

    test("COMPLIANCE: Castling Into Check IS prevented", () => {
        // Setup: White King at 4,0. Black Rook moving to attack 6,0.
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(4, 0, PieceType.King, 1);
        board.setTile(7, 0, PieceType.Rook, 1);
        board.setTile(6, 7, PieceType.Rook, 2); // Attacks destination 6,0

        const state = createGameState(board);
        state.turn = 0;

        const isCastlingValid = ChessEngine.isValidMove(state, 4, 0, 6, 0);

        expect(isCastlingValid).toBe(false);
    });

    test("COMPLIANCE: Pawn Double Move Enforces Rank", () => {
        const board = new ChessBoard({ width: 8, height: 8 });
        // White Pawn at y=5 (Rank 3) - NOT STARTING RANK (Rank 2 is y=6)
        board.setTile(0, 5, PieceType.Pawn, 1);

        const state = createGameState(board);
        state.turn = 0;

        // Try double move (0,5 -> 0,3)
        // dx=0, dy=-2. Direction is -1.
        const isDoubleValid = ChessEngine.isValidMove(state, 0, 5, 0, 3);

        expect(isDoubleValid).toBe(false);
    });
});
