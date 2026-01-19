
import { describe, expect, test } from "bun:test";
import { ChessBoard } from "../src/chess-board";
import { ChessEngine, type ChessGameState, type ChessBoardMove } from "../src/chess-engine";
import { PieceType } from "../src/piece-type.enums";

describe("ChessEngine Core Completion", () => {

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

    test("Pawn Promotion", () => {
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(0, 6, PieceType.Pawn, 2);

        const state = createGameState(board);
        state.turn = 1;

        const move: ChessBoardMove = {
            fromX: 0, fromY: 6,
            toX: 0, toY: 7,
            promotion: PieceType.Queen
        };

        const newState = ChessEngine.applyMove(state, move);
        const newTile = newState.board.getTile(0, 7);

        expect(newTile.piece).toBe(PieceType.Queen);
        expect(newTile.owner_identifier).toBe(2);
        expect(newState.board.getTile(0, 6).piece).toBe(PieceType.EmptySquare);
    });

    test("Castling (KingSide)", () => {
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(4, 0, PieceType.King, 2);
        board.setTile(7, 0, PieceType.Rook, 2);

        const state = createGameState(board);
        state.turn = 1;

        const move: ChessBoardMove = {
            fromX: 4, fromY: 0,
            toX: 6, toY: 0
        };

        const isValid = ChessEngine.isValidMove(state, 4, 0, 6, 0);
        expect(isValid).toBe(true);

        const newState = ChessEngine.applyMove(state, move);

        expect(newState.board.getTile(6, 0).piece).toBe(PieceType.King);
        expect(newState.board.getTile(4, 0).piece).toBe(PieceType.EmptySquare);
        expect(newState.board.getTile(5, 0).piece).toBe(PieceType.Rook);
        expect(newState.board.getTile(7, 0).piece).toBe(PieceType.EmptySquare);

        expect(newState.castlingRights.get(2)!.kingSide).toBe(false);
        expect(newState.castlingRights.get(2)!.queenSide).toBe(false);
    });

    test("En Passant", () => {
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(3, 3, PieceType.Pawn, 1);

        const state = createGameState(board);

        // 1. P2 performs double move
        board.setTile(4, 1, PieceType.Pawn, 2);
        const move1: ChessBoardMove = { fromX: 4, fromY: 1, toX: 4, toY: 3 };

        const stateAfterMove1 = ChessEngine.applyMove(state, move1);

        expect(stateAfterMove1.enPassantTarget).not.toBeNull();
        expect(stateAfterMove1.enPassantTarget!.x).toBe(4);
        expect(stateAfterMove1.enPassantTarget!.y).toBe(2);

        // 2. P1 captures En Passant
        const move2: ChessBoardMove = { fromX: 3, fromY: 3, toX: 4, toY: 2 };

        const isValid = ChessEngine.isValidMove(stateAfterMove1, 3, 3, 4, 2);
        expect(isValid).toBe(true);

        const stateAfterCapture = ChessEngine.applyMove(stateAfterMove1, move2);

        expect(stateAfterCapture.board.getTile(4, 2).piece).toBe(PieceType.Pawn);
        expect(stateAfterCapture.board.getTile(4, 2).owner_identifier).toBe(1);
        expect(stateAfterCapture.board.getTile(4, 3).piece).toBe(PieceType.EmptySquare);
    });

    test("Team Logic", () => {
        const board = new ChessBoard({ width: 8, height: 8 });
        board.setTile(0, 0, PieceType.Rook, 1);
        board.setTile(1, 0, PieceType.Rook, 2);

        const state = createGameState(board);
        state.teams.push({ team_identifier: 1, player_identifiers: [1, 2] }); // Team 1 has P1 and P2
        state.turn = 0; // P1

        const isValid = ChessEngine.isValidMove(state, 0, 0, 1, 0); // Teammate capture
        expect(isValid).toBe(false);

        board.setTile(2, 0, PieceType.Rook, 3);
        const isValidCapture = ChessEngine.isValidMove(state, 0, 0, 2, 0); // Blocked by teammate
        expect(isValidCapture).toBe(false);

        board.setTile(0, 1, PieceType.Rook, 3); // P3 directly above P1
        const isValidCaptureDirect = ChessEngine.isValidMove(state, 0, 0, 0, 1);
        expect(isValidCaptureDirect).toBe(true);
    });

    test("14 Player / 2 Team Chaos", () => {
        // 14 Players. Team A: 1-7. Team B: 8-14.
        const board = new ChessBoard({ width: 10, height: 10 });
        const gameState = createGameState(board);

        // Setup Teams
        const teamA = [1, 2, 3, 4, 5, 6, 7];
        const teamB = [8, 9, 10, 11, 12, 13, 14];
        gameState.teams.push({ team_identifier: 100, player_identifiers: teamA });
        gameState.teams.push({ team_identifier: 200, player_identifiers: teamB });

        gameState.participants = [...teamA, ...teamB];
        gameState.turn = 0; // Starts at Index 0 (Player 1)

        // Setup Pawns
        // P1 (Team A) at (0, 8), moves Up (direction -1)
        board.setTile(0, 8, PieceType.Pawn, 1);

        // P2 (Team A) at (0, 7) - Teammate blocking P1
        board.setTile(0, 7, PieceType.Pawn, 2);

        // P8 (Team B) at (1, 7) - Enemy trigger for capture
        board.setTile(1, 7, PieceType.Pawn, 8);

        // 1. Verify P1 blocked by Teammate P2
        // gameState.turn is 0 (P1)
        const p1Blocked = ChessEngine.isValidMove(gameState, 0, 8, 0, 7);
        expect(p1Blocked).toBe(false);

        // 2. Verify P1 can capture Enemy P8
        const p1Capture = ChessEngine.isValidMove(gameState, 0, 8, 1, 7);
        expect(p1Capture).toBe(true);

        // 3. Verify Turn Rotation
        // Move P1: (0, 8) -> (1, 7) (Capture)
        const move = { fromX: 0, fromY: 8, toX: 1, toY: 7 };
        const nextState = ChessEngine.applyMove(gameState, move);

        // Turn should go from Index 0 (Player 1) to Index 1 (Player 2)
        expect(nextState.turn).toBe(1);
        expect(nextState.participants[nextState.turn]).toBe(2);

        // 4. Verify P2 Move (Team A, but Index > 0)
        // With current simple logic, "direction = (owner === 1) ? -1 : 1"
        // So P2 has direction 1 (Down).
        // P2 is at (0, 7). Moves to (0, 8) which is now empty (P1 moved away).
        const moveP2 = { fromX: 0, fromY: 7, toX: 0, toY: 8 };
        // Check validity
        const p2Valid = ChessEngine.isValidMove(nextState, 0, 7, 0, 8);
        expect(p2Valid).toBe(true);

        const state3 = ChessEngine.applyMove(nextState, moveP2);
        expect(state3.turn).toBe(2); // Index 2 -> Player 3
    });
});
