import { ChessBoard, type ChessBoardConstructorIngredients, type ChessBoardTile } from "./chess-board";
import { PieceType } from "./piece-type.enums";

export type ChessGameTeam = {
    team_identifier: number;
    player_identifiers: number[];
}

export type ChessGameState = {
    board: ChessBoard;
    turn: number; // 0-indexed player ID whose turn it is
    participants: number[]; // array of player IDs

    // Team System: Map TeamID -> Array of PlayerIDs
    teams: ChessGameTeam[];

    // Castling Rights: Map PlayerID -> { kingSide: boolean, queenSide: boolean }
    // true = can castle, false = moved or lost right
    castlingRights: Map<number, { kingSide: boolean, queenSide: boolean }>;

    // En Passant Target: encoded x,y or null if none
    enPassantTarget: { x: number, y: number } | null;

    // Move History for undo/replay
    moveHistory: ChessBoardMove[];

    // Check Status: Map PlayerID -> boolean
    isInCheck?: Map<number, boolean>;
}

export type ChessBoardMove = {
    fromX: number;
    fromY: number;

    toX: number;
    toY: number;

    promotion?: PieceType; // Optional: what piece to promote to
}

/**
 * Core stateless game engine.
 * Provides functions for move validation, state updates, and rule enforcement.
 */
export class ChessEngine {


    public static newGame(board: ChessBoard, teams: ChessGameTeam[]): ChessGameState {
        let gameState: ChessGameState = {
            board: board,
            turn: 0,
            participants: teams.flatMap(team => team.player_identifiers),
            teams: teams,
            castlingRights: new Map<number, { kingSide: boolean, queenSide: boolean }>(),
            enPassantTarget: null,
            moveHistory: []
        };

        return gameState;
    }

    /**
     * Fully validates a move including:
     * 1. Bounds check
     * 2. Tile ownership check
     * 3. Friendly fire check
     * 4. Kinematic validity (can piece move that way?)
     * 5. Path obstacles (for sliders)
     * 6. Special rules (Pawn, Castling)
     * 
     * @param gameState Current game state
     * @param fromX Source X
     * @param fromY Source Y
     * @param toX Destination X
     * @param toY Destination Y
     * @param ignoreTurn If true, allows checking moves for pieces regardless of whose turn it is (useful for check detection).
     */
    public static isValidMove(gameState: ChessGameState, fromX: number, fromY: number, toX: number, toY: number, ignoreTurn: boolean = false): boolean {
        const board = gameState.board;
        if (board.isOutOfBounds(fromX, fromY) || board.isOutOfBounds(toX, toY)) return false;
        if (fromX === toX && fromY === toY) return false;

        const startTile: ChessBoardTile = board.getTile(fromX, fromY);
        const endTile: ChessBoardTile = board.getTile(toX, toY);

        // Cannot move an empty tile or environmental tile
        if (startTile.piece === PieceType.None || startTile.piece >= 250) return false;

        // Turn check: Only enforce if ignoreTurn is false
        if (!ignoreTurn) {
            const currentPlayer = gameState.participants[gameState.turn % gameState.participants.length];
            if (currentPlayer !== startTile.owner_identifier) {
                return false;
            }
        }

        // Team Logic: Cannot capture friendly pieces (same team)
        if (endTile.owner_identifier !== 0) {
            if (ChessEngine.areTeammates(gameState, startTile.owner_identifier, endTile.owner_identifier)) {
                return false;
            }
        }

        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // 1. Basic Kinematic Check
        const isKinematic = ChessEngine.isKinematicallyValid(startTile.piece, dx, dy, startTile.owner_identifier);

        // Special Case: Pawns
        if (startTile.piece === PieceType.Pawn) {
            if (!ChessEngine.isValidPawnMove(gameState, startTile, endTile, dx, dy, absDx, absDy)) {
                return false;
            }
        }
        // Special Case: Castling (King move > 1 step)
        else if (startTile.piece === PieceType.King && absDx > 1) {
            // Castling logic involves safety checks (cannot castle through check), so we don't ignore turn usually?
            // Actually, castling always implies "my turn", so ignoreTurn context doesn't break this.
            if (!ChessEngine.isCastlingValid(gameState, startTile, toX, toY)) {
                return false;
            }
        }
        else if (!isKinematic) {
            return false;
        }

        // 2. Path Obstruction Check (for sliders)
        if (!!(startTile.piece & 0x4)) { // If Slider (Bit 2)
            const stepX = dx === 0 ? 0 : dx / absDx;
            const stepY = dy === 0 ? 0 : dy / absDy;

            let checkX = fromX + stepX;
            let checkY = fromY + stepY;

            while (checkX !== toX || checkY !== toY) {
                const p = board.getTile(checkX, checkY).piece;
                if (p !== PieceType.None && p !== PieceType.EmptySquare) {
                    return false; // Path blocked
                }
                checkX += stepX;
                checkY += stepY;
            }
        }

        return true;
    }

    /**
     * specialized validation for Pawn movement.
     */
    private static isValidPawnMove(gameState: ChessGameState, startTile: ChessBoardTile, endTile: ChessBoardTile, dx: number, dy: number, absDx: number, absDy: number): boolean {
        // Determine "forward" direction based on owner.
        // Owner 1 (White) moves UP (-1), Owner 2 (Black) moves DOWN (+1).
        const direction = (startTile.owner_identifier === 1) ? -1 : 1;

        // Forward moves are ONLY valid if destination is empty
        if (dx === 0 && (dy === direction || dy === direction * 2)) {
            if (endTile.piece !== PieceType.None && endTile.piece !== PieceType.EmptySquare) return false;

            // Double move check
            if (dy === direction * 2) {
                // 1. Must be on starting rank
                // Owner 1 (White): Height - 2 (Standard Rank 2)
                // Owner 2 (Black): 1 (Standard Rank 7)
                // Note: Coordinates are 0-indexed. 
                const height = gameState.board.getHeight();
                const expectedStartY = (startTile.owner_identifier === 1) ? (height - 2) : 1;

                if (startTile.y !== expectedStartY) {
                    return false; // Not on starting rank
                }

                // 2. Path must be clear
                const intermediate = gameState.board.getTile(startTile.x! + 0, startTile.y! + direction).piece;
                if (intermediate !== PieceType.None && intermediate !== PieceType.EmptySquare) return false;
            }
        }
        // Diagonal captures
        else if (absDx === 1 && dy === direction) {
            // Normal capture
            if (endTile.piece !== PieceType.None && endTile.piece !== PieceType.EmptySquare) {
                return true;
            }
            // En Passant
            if (gameState.enPassantTarget && gameState.enPassantTarget.x === endTile.x && gameState.enPassantTarget.y === endTile.y) {
                return true;
            }
            return false;
        }
        else {
            return false;
        }
        return true;
    }

    /**
     * Validates castling logic including rights, path clearance, and safety (check).
     */
    private static isCastlingValid(gameState: ChessGameState, kingTile: ChessBoardTile, toX: number, toY: number): boolean {
        // 1. Check Castling Rights
        const rights = gameState.castlingRights.get(kingTile.owner_identifier);
        if (!rights) return false;

        const dx = toX - (kingTile.x!);
        // Kingside: dx > 0, Queenside: dx < 0
        if (dx > 0 && !rights.kingSide) return false;
        if (dx < 0 && !rights.queenSide) return false;

        // 2. Path Clear
        const step = dx > 0 ? 1 : -1;
        let checkX = kingTile.x! + step;
        while (checkX !== toX) { // Check up to king's destination
            const p = gameState.board.getTile(checkX, kingTile.y!).piece;
            if (p !== PieceType.None && p !== PieceType.EmptySquare) return false;
            checkX += step;
        }

        // 3. Safety Check: Cannot castle out of, through, or into check.
        // Squares involved: King Start, King Cross, King End.

        // Start Square
        if (ChessEngine.isSquareUnderAttack(gameState, kingTile.x!, kingTile.y!, kingTile.owner_identifier)) return false;

        // Crossed Square (x + step)
        if (ChessEngine.isSquareUnderAttack(gameState, kingTile.x! + step, kingTile.y!, kingTile.owner_identifier)) return false;

        // Destination Square
        if (ChessEngine.isSquareUnderAttack(gameState, toX, toY, kingTile.owner_identifier)) return false;

        return true;
    }

    /**
     * Checks if a specific square is under attack by any enemy piece.
     * Iterates through all board tiles to find threats.
     * 
     * @param gameState 
     * @param targetX 
     * @param targetY 
     * @param defenderOwner The owner of the piece being attacked (to identify enemies)
     */
    public static isSquareUnderAttack(gameState: ChessGameState, targetX: number, targetY: number, defenderOwner: number): boolean {
        const board = gameState.board;
        const width = board.getWidth();
        const height = board.getHeight();

        // Iterate all tiles
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile = board.getTile(x, y);

                // Skip empty or friendly
                if (tile.piece === PieceType.None || tile.piece === PieceType.EmptySquare || tile.piece >= 250) continue;
                if (ChessEngine.areTeammates(gameState, tile.owner_identifier, defenderOwner)) continue; // Friendly

                // Check if this piece can move to target
                // We use isValidMove with ignoreTurn=true
                if (ChessEngine.isValidMove(gameState, x, y, targetX, targetY, true)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static areTeammates(gameState: ChessGameState, p1: number, p2: number): boolean {
        if (p1 === p2) return true; // Same player is always teammate
        // iterate teams
        for (const members of gameState.teams.values()) {
            if (members.player_identifiers.includes(p1) && members.player_identifiers.includes(p2)) return true;
        }
        return false;
    }

    /**
     * Pure function to check if a piece's shape/capability allows this offset.
     */
    private static isKinematicallyValid(piece: PieceType, dx: number, dy: number, owner: number): boolean {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const maxDelta = Math.max(absDx, absDy);

        if (piece & 0x8) { // Special Types
            if (piece === PieceType.Knight) {
                return (absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1);
            }
            if (piece === PieceType.Pawn) {
                // Handled in specific pawn logic now, but returning true for basic step for fallback
                return false; // Pawn logic is complex, delegating to main loop
            }
            // King is NOT 0x8. King is 0x1 | 0x2 = 3.
            return false;
        }

        const isDiagonal = absDx === absDy && absDx !== 0;
        const isOrthogonal = (dx === 0 || dy === 0) && (dx !== 0 || dy !== 0);

        if (isDiagonal && (piece & 0x1)) {
            return !!(piece & 0x4) || maxDelta === 1;
        }
        if (isOrthogonal && (piece & 0x2)) {
            return !!(piece & 0x4) || maxDelta === 1;
        }

        return false;
    }

    public static applyMove(gameState: ChessGameState, move: ChessBoardMove): ChessGameState {
        // 1. Clone the board to ensure immutability
        const newBoard = gameState.board.clone();

        // 2. Get pieces and info
        const startTile = gameState.board.getTile(move.fromX, move.fromY);
        // Note: we use original board for reading, newBoard for writing

        const piece = startTile.piece;
        const owner = startTile.owner_identifier;
        let finalPiece = piece;

        // 3. Handle Promotion
        if (piece === PieceType.Pawn && move.promotion) {
            // If checking validity, ensuring it's the last rank would be good usage.
            finalPiece = move.promotion;
        }

        // 4. Handle En Passant Capture
        // If moving pawn diagonally to an empty square, it's en passant (assuming isValidMove passed)
        if (piece === PieceType.Pawn && Math.abs(move.toX - move.fromX) === 1) {
            const targetTile = newBoard.getTile(move.toX, move.toY);
            if (targetTile.piece === PieceType.None || targetTile.piece === PieceType.EmptySquare) {
                // Capture the pawn behind the move
                const direction = (owner === 1) ? -1 : 1;
                // If we moved to (toX, toY), the captured pawn is at (toX, toY - direction)
                newBoard.setTile(move.toX, move.toY - direction, PieceType.EmptySquare, 0);
            }
        }

        // 5. Handle Castling
        // If King moves > 1 square
        if (piece === PieceType.King && Math.abs(move.toX - move.fromX) > 1) {
            const dx = move.toX - move.fromX;
            const y = move.fromY; // Rank doesn't change
            // KingSide (dx > 0) or QueenSide (dx < 0)

            const rookDestX = dx > 0 ? move.toX - 1 : move.toX + 1;

            // Find source Rook.
            // Scan from destination outwards
            const step = dx > 0 ? 1 : -1;
            let rookSrcX = move.toX + step;
            while (newBoard.getTile(rookSrcX, y).piece === PieceType.EmptySquare && !newBoard.isOutOfBounds(rookSrcX, y)) {
                rookSrcX += step;
            }

            // found potential rook
            const rookTile = newBoard.getTile(rookSrcX, y);
            if (rookTile.piece === PieceType.Rook) {
                newBoard.setTile(rookDestX, y, PieceType.Rook, owner);
                newBoard.setTile(rookSrcX, y, PieceType.EmptySquare, 0);
            }
        }

        // 6. Move the Main Piece
        newBoard.setTile(move.toX, move.toY, finalPiece, owner);
        newBoard.setTile(move.fromX, move.fromY, PieceType.EmptySquare, 0);

        // 7. Update Castling Rights
        const newCastlingRights = new Map(gameState.castlingRights); // Shallow copy of map
        // If King moves, lose all rights
        if (piece === PieceType.King) {
            newCastlingRights.set(owner, { kingSide: false, queenSide: false });
        }
        // If Rook moves, lose specific right
        if (piece === PieceType.Rook) {
            // Need to know WHICH rook.
            // Heuristic: If we move a Rook from x=0 (Queenside?) or x=Width-1 (Kingside?)
            if (move.fromX === 0) {
                const rights = newCastlingRights.get(owner);
                if (rights) newCastlingRights.set(owner, { ...rights, queenSide: false });
            }
            else if (move.fromX === gameState.board.getWidth() - 1) {
                const rights = newCastlingRights.get(owner);
                if (rights) newCastlingRights.set(owner, { ...rights, kingSide: false });
            }
        }

        // 8. Update En Passant Target
        let newEnPassant: { x: number, y: number } | null = null;
        if (piece === PieceType.Pawn && Math.abs(move.toY - move.fromY) === 2) {
            newEnPassant = {
                x: move.fromX,
                y: (move.fromY + move.toY) / 2
            };
        }

        // 9. Update Turn
        const newTurn = (gameState.turn + 1) % gameState.participants.length;

        // 10. Update History
        const newHistory = [...gameState.moveHistory, move];

        return {
            board: newBoard,
            turn: newTurn,
            participants: [...gameState.participants],
            teams: gameState.teams, // Reference share is fine if we don't mutate map content
            castlingRights: newCastlingRights,
            enPassantTarget: newEnPassant,
            moveHistory: newHistory
        };
    }

    /**
     * Convert game state to FEN (Forsyth–Edwards Notation) string
     */
    public static toFEN(gameState: ChessGameState): string {
        const board = gameState.board;
        const width = board.getWidth();
        const height = board.getHeight();

        // Piece to FEN character mapping
        const pieceToChar = (piece: PieceType, owner: number): string => {
            const charMap: Record<number, string> = {
                [PieceType.Pawn]: 'p',
                [PieceType.Knight]: 'n',
                [PieceType.Bishop]: 'b',
                [PieceType.Rook]: 'r',
                [PieceType.Queen]: 'q',
                [PieceType.King]: 'k',
            };
            const c = charMap[piece] ?? '';
            return owner === 1 ? c.toUpperCase() : c; // White = uppercase
        };

        // Build board section
        const rows: string[] = [];
        for (let y = 0; y < height; y++) {
            let row = '';
            let emptyCount = 0;

            for (let x = 0; x < width; x++) {
                const tile = board.getTile(x, y);
                if (tile.piece === PieceType.None || tile.piece === PieceType.EmptySquare || tile.piece >= 250) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        row += emptyCount.toString();
                        emptyCount = 0;
                    }
                    row += pieceToChar(tile.piece, tile.owner_identifier);
                }
            }
            if (emptyCount > 0) row += emptyCount.toString();
            rows.push(row);
        }

        // Active color: 'w' or 'b'
        const activeColor = gameState.participants[gameState.turn] === 1 ? 'w' : 'b';

        // Castling rights
        let castling = '';
        const whiteRights = gameState.castlingRights.get(1);
        const blackRights = gameState.castlingRights.get(2);
        if (whiteRights?.kingSide) castling += 'K';
        if (whiteRights?.queenSide) castling += 'Q';
        if (blackRights?.kingSide) castling += 'k';
        if (blackRights?.queenSide) castling += 'q';
        if (!castling) castling = '-';

        // En passant
        let enPassant = '-';
        if (gameState.enPassantTarget) {
            const file = String.fromCharCode('a'.charCodeAt(0) + gameState.enPassantTarget.x);
            const rank = height - gameState.enPassantTarget.y;
            enPassant = `${file}${rank}`;
        }

        // Halfmove clock (simplified - always 0) and fullmove number
        const halfmove = 0;
        const fullmove = Math.floor(gameState.moveHistory.length / 2) + 1;

        return `${rows.join('/')} ${activeColor} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
    }

    /**
     * Convert UCI move format (e.g., "e2e4") to ChessBoardMove
     */
    public static uciToMove(uci: string): ChessBoardMove {
        if (uci.length < 4) throw new Error(`Invalid UCI move: ${uci}`);

        const fromFile = uci.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromRankChar = uci[1];
        const toFile = uci.charCodeAt(2) - 'a'.charCodeAt(0);
        const toRankChar = uci[3];

        if (!fromRankChar || !toRankChar) throw new Error(`Invalid UCI move: ${uci}`);

        const fromRank = parseInt(fromRankChar);
        const toRank = parseInt(toRankChar);

        // Convert rank to Y (assuming 8-tall board: rank 1 = y=7, rank 8 = y=0)
        const fromY = 8 - fromRank;
        const toY = 8 - toRank;

        // Check for promotion (5th character)
        let promotion: PieceType | undefined;
        if (uci.length >= 5) {
            const promoChar = uci[4]?.toLowerCase();
            if (promoChar) {
                const promoMap: Record<string, PieceType> = {
                    'q': PieceType.Queen,
                    'r': PieceType.Rook,
                    'b': PieceType.Bishop,
                    'n': PieceType.Knight,
                };
                promotion = promoMap[promoChar];
            }
        }

        return {
            fromX: fromFile,
            fromY: fromY,
            toX: toFile,
            toY: toY,
            promotion
        };
    }

    public static ChessBoardFactory(ingredients: ChessBoardConstructorIngredients): ChessBoard {
        return new ChessBoard(ingredients);
    }
}