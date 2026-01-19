
import { describe, expect, test } from "bun:test";
import { ChessBoard } from "../src/chess-board";
import { ChessEngine, type ChessGameState } from "../src/chess-engine";
import { ChessNotation } from "../src/chess-notation";
import { PieceType } from "../src/piece-type.enums";

describe("Immortal Game Reproduction", () => {

    // Standard starting position setup
    const setupStandardBoard = (): ChessGameState => {
        const board = new ChessBoard({ width: 8, height: 8 });

        // P2 (Black) at top (Y=0,1). P1 (White) at bottom (Y=6,7). 
        // Based on previous findings: P1 moves UP (-1), P2 moves DOWN (+1).
        // Y=0: Black pieces. Y=1: Black Pawns.
        // Y=6: White Pawns. Y=7: White pieces.

        // Black
        const blackHome = [PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen, PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook];
        blackHome.forEach((p, x) => board.setTile(x, 0, p, 2));
        for (let x = 0; x < 8; x++) board.setTile(x, 1, PieceType.Pawn, 2);

        // White
        const whiteHome = [PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen, PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook];
        whiteHome.forEach((p, x) => board.setTile(x, 7, p, 1));
        for (let x = 0; x < 8; x++) board.setTile(x, 6, PieceType.Pawn, 1);

        return {
            board,
            turn: 0,
            participants: [1, 2],
            teams: [], // teams logic optional for 1v1
            castlingRights: new Map([
                [1, { kingSide: true, queenSide: true }],
                [2, { kingSide: true, queenSide: true }]
            ]),
            enPassantTarget: null,
            moveHistory: []
        };
    };

    test("Anderssen vs. Kieseritzky (1851)", () => {
        let state = setupStandardBoard();

        const moves = [
            "e4", "e5",
            "f4", "exf4",
            "Bc4", "Qh4+",
            "Kf1", "b5",
            "Bxb5", "Nf6",
            "Nf3", "Qh6",
            "d3", "Nh5",
            "Nh4", "Qg5",
            "Nf5", "c6",
            "g4", "Nf6",
            "Rg1", "cxb5",
            "h4", "Qg6",
            "h5", "Qg5",
            "Qf3", "Ng8",
            "Bxf4", "Qf6",
            "Nc3", "Bc5",
            "Nd5", "Qxb2",
            "Bd6", "Bxg1", // 18. Bd6 ...? Usually Bd6.
            // Wait, common notation might vary. 
            // 18. Bd6 Bxg1?
            // Actually move 18 is Bd6. Black is ... Bxg1 ??
            // Let's stick to the list.
            // Wikipedia: 
            // 18. Bd6 Bxg1? 
            // 19. e5 Qxa1+
            // 20. Ke2 Na6
            // 21. Nxg7+ Kd8
            // 22. Qf6+ Nxf6
            // 23. Be7#

            "e5", "Qxa1+", // Capture Rook with Check. (My notation parser strips +)
            "Ke2", "Na6",
            "Nxg7+", "Kd8",
            "Qf6+", "Nxf6",
            "Be7#"
        ];

        for (const san of moves) {
            console.log(`Playing ${san}... Turn: ${state.turn}`);
            try {
                const move = ChessNotation.parseMove(state, san);
                state = ChessEngine.applyMove(state, move);
            } catch (e) {
                console.error(`Failed at move ${san}`);
                throw e;
            }
        }

        // Verify Checkmate
        // I don't have isCheckmate() yet, but I can verify the final board state.
        // Be7 should be at e7.
        // King at d8.
        const e7 = state.board.getTileByAlgebraicCoordinates('e', 7);
        expect(e7.piece).toBe(PieceType.Bishop);
        expect(e7.owner_identifier).toBe(1); // White Bishop delivers mate
    });
});
