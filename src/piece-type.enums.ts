export enum PieceType {
    // Reserved / Environmental Range (250-255)
    ConnectedEdge = 254,
    EmptyEdge = 253,
    Impassable = 252,
    SpecialTile = 251,
    EmptySquare = 250,

    // Base Piece Types (Values 0-15)
    // Bit 0: Diagonal, Bit 1: Orthogonal, Bit 2: Slider, Bit 3: Special
    None = 0,
    Pawn = 0x8 | 0x1,
    Knight = 0x8 | 0x0,
    Bishop = 0x1 | 0x4,
    Rook = 0x2 | 0x4,
    Queen = 0x1 | 0x2 | 0x4,
    King = 0x1 | 0x2,
}