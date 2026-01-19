
import { ChessBoard, type ChessBoardTile } from "./chess-board";
import { ChessEngine, type ChessGameState, type ChessBoardMove, type ChessGameTeam } from "./chess-engine";
import { PieceType } from "./piece-type.enums";

export class ChessNotation {

    /**
     * Parses a Standard Algebraic Notation (SAN) move string into a ChessBoardMove.
     * Examples: "e4", "Nf3", "exf4", "O-O", "Nbd7"
     */
    public static parseMove(gameState: ChessGameState, san: string): ChessBoardMove {
        const cleanSan = san.replace(/[+#]/g, ''); // Remove check/mate indicators

        // 1. Handle Castling
        if (cleanSan === "O-O" || cleanSan === "O-O-O") {
            return ChessNotation.parseCastling(gameState, cleanSan);
        }

        // 2. Regex Parse
        // Groups: 
        // 1: Piece (N, B, R, Q, K) - undefined for pawn
        // 2: Disambiguation (file a-h or rank 1-8 or both)
        // 3: Capture (x) - optional
        // 4: Target File (a-h)
        // 5: Target Rank (1-8)
        // 6: Promotion (=Q) - optional
        const moveRegex = /^([NBRQK])?([a-h1-8]{1,2})?(x)?([a-h])([1-8])(=[NBRQ])?$/;
        const match = cleanSan.match(moveRegex);

        if (!match) {
            throw new Error(`Invalid SAN format: ${san}`);
        }

        const pieceChar = match[1];
        const disambiguation = match[2];
        const isCapture = !!match[3];
        const targetFile = match[4];
        const targetRankString = match[5];
        const promotionString = match[6];

        if (!targetFile || !targetRankString) {
            throw new Error(`Invalid target square in SAN: ${san}`);
        }

        const targetRank = parseInt(targetRankString);

        const toX = targetFile.charCodeAt(0) - 'a'.charCodeAt(0);
        // Rank 1 = Y=7, Rank 8 = Y=0 (Standard Board)
        const targetY = 8 - targetRank;


        const pieceType = ChessNotation.charToPieceType(pieceChar);
        const promotion = promotionString ? ChessNotation.charToPieceType(promotionString.charAt(1)) : undefined;

        // 3. Find Candidate Pieces
        const candidates = ChessNotation.findCandidates(gameState, pieceType, toX, targetY);

        // 4. Filter by Disambiguation
        let filtered = candidates;
        if (disambiguation) {
            if (disambiguation.length === 1) {
                const charCode = disambiguation.charCodeAt(0);
                if (charCode >= 'a'.charCodeAt(0) && charCode <= 'h'.charCodeAt(0)) {
                    // File Disambiguation
                    const fileIdx = charCode - 'a'.charCodeAt(0);
                    filtered = filtered.filter(c => c.x === fileIdx);
                } else {
                    // Rank Disambiguation
                    const rankIdx = 8 - parseInt(disambiguation);
                    filtered = filtered.filter(c => c.y === rankIdx);
                }
            } else if (disambiguation.length === 2) {
                // Both
                const fileIdx = disambiguation.charCodeAt(0) - 'a'.charCodeAt(0);
                const rankIdx = 8 - parseInt(disambiguation.charAt(1));
                filtered = filtered.filter(c => c.x === fileIdx && c.y === rankIdx);
            }
        }

        // 5. Validation Check
        // We must ensure the move `from -> to` is legally valid.
        const validCandidates = filtered.filter(c =>
            ChessEngine.isValidMove(gameState, c.x!, c.y!, toX, targetY)
        );

        if (validCandidates.length === 0) {
            throw new Error(`No legal move found for ${san}`);
        }
        if (validCandidates.length > 1) {
            throw new Error(`Ambiguous move ${san}: found ${validCandidates.length} candidates`);
        }

        const selected = validCandidates[0];

        if (!selected || selected.x === undefined || selected.y === undefined) {
            throw new Error(`Logic Error: Selected candidate is undefined or missing coordinates.`);
        }

        return {
            fromX: selected.x,
            fromY: selected.y,
            toX: toX,
            toY: targetY,
            promotion: promotion
        };
    }

    private static parseCastling(gameState: ChessGameState, san: string): ChessBoardMove {
        const turn = gameState.turn;
        const pid = gameState.participants[turn]; // Current player ID

        // Find King
        // Assuming standard board, scan for King owned by pid
        // Optimization: Could store king pos in GameState, but scanning is fine for now
        let kingTile: ChessBoardTile | null = null;
        const board = gameState.board;
        // Need to loop board. ChessBoard doesn't have iterator.
        // Assume 8x8 scan.
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const tile = board.getTile(x, y);
                if (tile.piece === PieceType.King && tile.owner_identifier === pid) {
                    kingTile = tile;
                    break;
                }
            }
            if (kingTile) break;
        }

        if (!kingTile) throw new Error("King not found for castling");

        const isKingSide = san === "O-O";
        const dx = isKingSide ? 2 : -2;

        return {
            fromX: kingTile.x!,
            fromY: kingTile.y!,
            toX: kingTile.x! + dx,
            toY: kingTile.y!
        };
    }

    private static charToPieceType(char?: string): PieceType {
        if (!char) return PieceType.Pawn;
        switch (char) {
            case 'N': return PieceType.Knight;
            case 'B': return PieceType.Bishop;
            case 'R': return PieceType.Rook;
            case 'Q': return PieceType.Queen;
            case 'K': return PieceType.King;
            default: return PieceType.Pawn;
        }
    }

    private static findCandidates(gameState: ChessGameState, pieceType: PieceType, toX: number, toY: number): ChessBoardTile[] {
        const turn = gameState.turn;
        const pid = gameState.participants[turn];
        const candidates: ChessBoardTile[] = [];

        // Scan board
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const tile = gameState.board.getTile(x, y);
                if (tile.piece === pieceType && tile.owner_identifier === pid) {
                    candidates.push(tile);
                }
            }
        }
        return candidates;
    }

    /**
     * Convert a ChessBoardMove to Standard Algebraic Notation (SAN)
     */
    public static moveToSAN(move: ChessBoardMove, gameState: ChessGameState): string {
        const board = gameState.board;
        const piece = board.getTile(move.fromX, move.fromY).piece;
        const targetTile = board.getTile(move.toX, move.toY);

        const files = 'abcdefgh';
        const toFile = files[move.toX] ?? '?';
        const toRank = 8 - move.toY;
        const fromFile = files[move.fromX] ?? '?';

        // Castling
        if (piece === PieceType.King && Math.abs(move.toX - move.fromX) > 1) {
            return move.toX > move.fromX ? "O-O" : "O-O-O";
        }

        // Piece prefix
        const pieceChars: Record<number, string> = {
            [PieceType.Knight]: 'N',
            [PieceType.Bishop]: 'B',
            [PieceType.Rook]: 'R',
            [PieceType.Queen]: 'Q',
            [PieceType.King]: 'K',
        };
        const piecePrefix = pieceChars[piece] ?? '';

        // Capture indicator
        const isCapture = targetTile.piece !== PieceType.None && targetTile.piece !== PieceType.EmptySquare;
        const captureStr = isCapture ? 'x' : '';

        // Pawn special: include from file on capture
        if (piece === PieceType.Pawn && isCapture) {
            const promoStr = move.promotion ? '=' + (pieceChars[move.promotion] ?? 'Q') : '';
            return `${fromFile}x${toFile}${toRank}${promoStr}`;
        }

        // Normal move
        const promoStr = move.promotion ? '=' + (pieceChars[move.promotion] ?? 'Q') : '';

        // For simplicity, skip disambiguation (would need to check other pieces)
        return `${piecePrefix}${captureStr}${toFile}${toRank}${promoStr}`;
    }
}

