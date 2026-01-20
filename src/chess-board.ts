import { PieceType } from "./piece-type.enums";

/**
 * Represents a single tile on the chessboard.
 * Returned by getter methods to provide context (coordinates, owner) alongside the piece.
 */
export interface ChessBoardTile {
    piece: PieceType;
    board: ChessBoard;
    owner_identifier: number; // 0 for neutral/none, 1-14 for players
    x?: number;
    y?: number;
}

export interface ChessBoardConstructorIngredients {
    width: number;
    height: number;
}

/**
 * The ChessBoard class manages the raw data of the board using a memory-efficient 1D Uint8Array.
 * It handles the storage of:
 * 1. Piece Type (what is on the square)
 * 2. Owner ID (who owns the piece)
 * 
 * It uses Bit Packing to store both these values in a single byte (0-255).
 */
export class ChessBoard {
    private width: number;
    private height: number;

    // 1D array storing packed byte values.
    // Index = y * width + x
    private tiles: Uint8Array;

    constructor(ingredients: ChessBoardConstructorIngredients) {
        this.width = ingredients.width;
        this.height = ingredients.height;
        this.tiles = new Uint8Array(this.width * this.height).fill(PieceType.EmptySquare);
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    /**
     * Sets a tile at specific coordinates.
     * 
     * **Bit Packing Strategy**:
     * - **Values < 250**: Playable Pieces
     *   - Lower 4 bits (0-15): PieceType enum
     *   - Upper 4 bits (16-240): Owner ID (0-14)
     * - **Values >= 250**: Environmental/Reserved types
     * 
     * @param x X coordinate (0-indexed)
     * @param y Y coordinate (0-indexed)
     * @param piece The PieceType to place
     * @param owner The ID of the player owning the piece (default 0)
     */
    public setTile(x: number, y: number, piece: PieceType, owner: number): void {
        if (this.isOutOfBounds(x, y)) return;

        let packed: number;
        if (piece >= 250) {
            packed = piece;
        } else {
            // Pack: (owner << 4) | (piece & 0x0F)
            // Ensure we don't exceed 249 for player pieces
            const safeOwner = Math.min(owner, 14);
            packed = (safeOwner << 4) | (piece & 0x0F);
        }

        this.tiles[y * this.width + x] = packed;
    }

    /**
     * Retrieves a tile from specific coordinates.
     * Unpacks the byte into PieceType and Owner ID.
     */
    public getTile(x: number, y: number): ChessBoardTile {
        if (this.isOutOfBounds(x, y)) {
            return { piece: PieceType.EmptySquare, board: this, owner_identifier: 0 };
        }

        const packed = this.tiles[y * this.width + x] ?? PieceType.EmptySquare;

        // Handle reserved range
        if (packed >= 250) {
            return { piece: packed as PieceType, owner_identifier: 0, board: this, x, y };
        }

        return {
            piece: (packed & 0x0F) as PieceType,
            owner_identifier: (packed >> 4) & 0x0F,
            board: this,
            x,
            y
        };
    }

    public getTileOwner(x: number, y: number): number {
        return this.getTile(x, y).owner_identifier;
    }

    /**
     * Helper to get a tile using algebraic notation (e.g. "a1", "e5").
     * Note: Assumes standard chess mapping where Rank 1 is at the bottom (Max Y).
     */
    public getTileByAlgebraicCoordinates(file: string, rank: number): ChessBoardTile {
        const x = file.charCodeAt(0) - 'a'.charCodeAt(0);
        // Rank 1 = Y=7, Rank 8 = Y=0 (for 8x8)
        const y = this.height - rank;
        return this.getTile(x, y);
    }

    public isOutOfBounds(x: number, y: number): boolean {
        return x < 0 || x >= this.width || y < 0 || y >= this.height;
    }

    /**
     * Create a deep copy of the board.
     */
    public clone(): ChessBoard {
        const newBoard = new ChessBoard({ width: this.width, height: this.height });
        newBoard.tiles = new Uint8Array(this.tiles);
        return newBoard;
    }

    /**
     * Populates the board from a 1D array of configuration objects.
     * Use this to quickly set up a specific board state (e.g. from a puzzle or custom variant).
     * 
     * @param layout Array of objects or PieceTypes. 
     *               If the array is shorter than tiles, remainder is untouched (default empty).
     */
    public populateFromArray(layout: ({ piece: PieceType, owner: number } | PieceType | null)[]): void {
        for (let i = 0; i < layout.length; i++) {
            const y = Math.floor(i / this.width);
            const x = i % this.width;

            if (this.isOutOfBounds(x, y)) break;

            const item = layout[i];

            if (item === null) {
                this.setTile(x, y, PieceType.EmptySquare, 0);
            } else if (typeof item === 'object' && 'piece' in item) {
                // Config object
                this.setTile(x, y, item.piece, item.owner);
            } else {
                // Just PieceType, assume neutral or 0? 
                // Or assume simple piece placement for test?
                this.setTile(x, y, item as PieceType, 0);
            }
        }
    }

    /**
     * Static Factory: Create a new ChessBoard from a generic array structure.
     * Supports arbitrary nesting:
     * - Top-level elements are treated as **Rows** (Y-axis).
     * - Nested elements within a row are **Flattened** to create the Columns (X-axis).
     * 
     * Examples:
     * - `[A, B]` -> 2 Rows, 1 Column (Vertical)
     * - `[[A, B]]` -> 1 Row, 2 Columns (Horizontal)
     * - `[[A, B], [C, D]]` -> 2x2 Square
     * - `[[A, [B, C]], D]` -> Row 0: [A, B, C], Row 1: [D].
     * 
     * @param input nested array structure containing PieceTypes, numbers, objects.
     */
    public static fromGrid(input: any[]): ChessBoard {
        // Helper to flatten a row's content into a pure list of items
        const flattenRow = (rowItems: any): any[] => {
            if (Array.isArray(rowItems)) {
                return rowItems.flatMap(flattenRow);
            }
            return [rowItems];
        };

        // 1. Parse Input into normalized Rows
        const normalizedRows: any[][] = [];
        let maxWidth = 0;

        for (const rawRow of input) {
            // Note: If rawRow is NOT an array (e.g. fromGrid([A, B])), 
            // the logic 'flattenRow' treats it as [A], so it becomes a row of width 1.
            // This means [A, B] = 2x1 Board. [[A, B]] = 1x2 Board.
            // If the user passes a mixed [ [A, B], C ], C becomes a row of width 1.
            const flatRow = flattenRow(rawRow);

            // Filter out purely empty/invalid slots if needed? 
            // No, preserve structure. null/undefined are valid "Empty" slots.

            normalizedRows.push(flatRow);
            maxWidth = Math.max(maxWidth, flatRow.length);
        }

        const height = normalizedRows.length;
        // width is maxWidth

        const board = new ChessBoard({ width: maxWidth, height });

        for (let y = 0; y < height; y++) {
            const row = normalizedRows[y];
            if (!row) continue;

            for (let x = 0; x < maxWidth; x++) {
                if (x >= row.length) continue; // Row shorter than max width

                const item = row[x];
                if (item === undefined || item === null) continue;

                if (typeof item === 'object' && 'piece' in item) {
                    board.setTile(x, y, item.piece, item.owner);
                } else if (typeof item === 'number') {
                    board.setTile(x, y, item as PieceType, 0);
                }
            }
        }
        return board;
    }
}