import { PieceType } from "./piece-type.enums";

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

export class ChessBoard {
    private width: number;
    private height: number;
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
     * Bit Packing Logic:
     * If value < 250:
     *   Bits 0-3: Piece type base (0-15)
     *   Bits 4-7: Owner ID (0-14)
     * If value >= 250:
     *   Reserved environmental types (no owner)
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

    public getTileByAlgebraicCoordinates(file: string, rank: number): ChessBoardTile {
        const x = file.charCodeAt(0) - 'a'.charCodeAt(0);
        // Rank 1 = Y=7, Rank 8 = Y=0
        const y = 8 - rank;
        return this.getTile(x, y);
    }

    public isOutOfBounds(x: number, y: number): boolean {
        return x < 0 || x >= this.width || y < 0 || y >= this.height;
    }

    public clone(): ChessBoard {
        const newBoard = new ChessBoard({ width: this.width, height: this.height });
        newBoard.tiles = new Uint8Array(this.tiles);
        return newBoard;
    }
}