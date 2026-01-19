/**
 * AI Match Example
 * 
 * Two PersonaAI instances play against each other.
 * Watch an Aggressive AI battle a Cautious AI!
 */

import { ChessBoard } from '../src/chess-board';
import { ChessEngine, } from '../src/chess-engine';
import { ChessNotation } from '../src/chess-notation';
import { PieceType } from '../src/piece-type.enums';
import { PersonaAI, AGGRESSIVE_AI, CAUTIOUS_AI } from '../src/persona/persona-ai';

// === Setup ===
function createStandardBoard(): ChessBoard {
    const board = new ChessBoard({ width: 8, height: 8 });
    const backRank = [
        PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen,
        PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook
    ];
    const pawns = Array(8).fill(PieceType.Pawn);

    [0, 1].forEach((y, i) => {
        const pieces = i === 0 ? backRank : pawns;
        pieces.forEach((p, x) => board.setTile(x, y, p, 2));
    });
    [6, 7].forEach((y, i) => {
        const pieces = i === 0 ? pawns : backRank;
        pieces.forEach((p, x) => board.setTile(x, y, p, 1));
    });
    return board;
}

async function playMatch() {
    console.log("=== AI vs AI Match ===\n");
    console.log("White: Aggressive AI");
    console.log("Black: Cautious AI\n");

    // Initialize AIs
    const whiteAI = AGGRESSIVE_AI;
    const blackAI = CAUTIOUS_AI;

    await whiteAI.initialize();
    await blackAI.initialize();

    // Create game
    const board = createStandardBoard();
    let gameState = ChessEngine.newGame(board, [
        { team_identifier: 1, player_identifiers: [1] },
        { team_identifier: 2, player_identifiers: [2] }
    ]);

    const moveLog: string[] = [];
    const maxMoves = 20;  // Limit for demo purposes

    console.log("Playing", maxMoves, "moves...\n");

    for (let i = 0; i < maxMoves; i++) {
        const currentPlayer = gameState.participants[gameState.turn];
        const ai = currentPlayer === 1 ? whiteAI : blackAI;
        const playerName = currentPlayer === 1 ? "White" : "Black";

        try {
            const fen = ChessEngine.toFEN(gameState);
            const uciMove = await ai.getBestMove(fen);
            const move = ChessEngine.uciToMove(uciMove);

            // Get SAN before applying (for proper notation)
            const san = ChessNotation.moveToSAN(move, gameState);

            gameState = ChessEngine.applyMove(gameState, move);
            moveLog.push(san);

            const moveNum = Math.floor(i / 2) + 1;
            if (currentPlayer === 1) {
                process.stdout.write(`${moveNum}. ${san} `);
            } else {
                console.log(san);
            }
        } catch (e: any) {
            console.log(`\n${playerName} error: ${e.message}`);
            break;
        }
    }

    console.log("\n\n--- Game Summary ---");
    console.log("Moves played:", moveLog.join(" "));
    console.log("Final FEN:", ChessEngine.toFEN(gameState));

    // Cleanup
    whiteAI.shutdown();
    blackAI.shutdown();
}

playMatch().catch(console.error);
