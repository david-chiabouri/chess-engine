export enum PieceType {
    // =================================================================
    // Reserved / Environmental Range (250-255)
    // Used for non-playable tiles or special board edge cases.
    // =================================================================
    ConnectedEdge = 254,
    EmptyEdge = 253,
    Impassable = 252,
    SpecialTile = 251,
    EmptySquare = 250,

    // =================================================================
    // Base Piece Types (Values 0-15)
    // Implemented using Bit Flags for efficient kinematic checks.
    // -----------------------------------------------------------------
    // Bit 0 (0x1): Diagonal Movement Capability
    // Bit 1 (0x2): Orthogonal (Straight) Movement Capability
    // Bit 2 (0x4): Slider (Infinite Range) Capability
    // Bit 3 (0x8): Special / Knight Logic
    // =================================================================
    None = 0,
    Pawn = 0x8 | 0x1,       // 9  (Special Movement + Diagonal Capture capability)
    Knight = 0x8 | 0x0,     // 8  (Special L-Shape)
    Bishop = 0x1 | 0x4,     // 5  (Diagonal + Slider)
    Rook = 0x2 | 0x4,       // 6  (Orthogonal + Slider)
    Queen = 0x1 | 0x2 | 0x4,// 7  (Diagonal + Orthogonal + Slider)
    King = 0x1 | 0x2,       // 3  (Diagonal + Orthogonal, but NO Slider)
}