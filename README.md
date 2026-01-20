# Chess Engine (TypeScript/Bun)

A flexible, open-source chess engine written in TypeScript for the Bun runtime. Features a modular architecture supporting custom board sizes, personality-driven AI opponents, and a terminal-based UI.

## Installation

```bash
bun install
```

## Developer Guide

The engine is designed to be easily embedded in your own TypeScript projects.

### 1. Creating Custom Boards (The Easy Way)

Forget manual coordinate setting. Use `ChessBoard.fromGrid` to visualize your board directly in code. Support for any shape or size, with standard piece types or custom owners.

```typescript
import { ChessBoard } from './src/chess-board';
import { PieceType } from './src/piece-type.enums';

// Example: A Custom 3x3 Mini-Game
const miniBoard = ChessBoard.fromGrid([
    [PieceType.Rook, PieceType.King, PieceType.Rook], // Rank 0 (Top)
    [PieceType.Pawn, PieceType.Pawn, PieceType.Pawn], // Rank 1
    [PieceType.EmptySquare, PieceType.EmptySquare, PieceType.EmptySquare]  // Rank 2 (Empty)
]);

// Example: White vs Black Custom Setup
const W = (p: PieceType) => ({ piece: p, owner: 1 });
const B = (p: PieceType) => ({ piece: p, owner: 2 });

const puzzle = ChessBoard.fromGrid([
    [null, B(PieceType.King), null],
    [null, B(PieceType.Pawn), null],
    [W(PieceType.Rook), null, W(PieceType.King)]
]);
```

### 2. Validating Moves Programmatically

The core engine is stateless and pure.

```typescript
import { ChessEngine } from './src/chess-engine';

// 1. Setup Game State
const state = ChessEngine.newGame(miniBoard, [
    { team_identifier: 1, player_identifiers: [1] }, // White
    { team_identifier: 2, player_identifiers: [2] }  // Black
]);

// 2. Check Validity
// Can the piece at (0,0) move to (0,2)?
const isValid = ChessEngine.isValidMove(state, 0, 0, 0, 2);

if (isValid) {
    // 3. Apply Move (Returns NEW Immutable State)
    const nextState = ChessEngine.applyMove(state, { 
        fromX: 0, fromY: 0, 
        toX: 0, toY: 2 
    });
}
```

## Features

### Core Engine
- **Flexible Board System**: Support for any board dimensions (e.g., 5x5, 10x10), not just standard 8x8.
- **Bit-Packed Representation**: Efficient memory usage for board tiles.
- **FEN Support**: Full import/export of game states using Forsyth–Edwards Notation.
- **Robust Move Validation**:
    - Legal moves for all standard pieces (Pawn, Knight, Bishop, Rook, Queen, King).
    - En Passant capture.
    - Pawn promotion.
    - **Safe Castling**: Correctly prevents castling through check, out of check, or into check.
    - **Strict Pawn Rules**: Double moves are only allowed from the starting rank.

### AI & Personality
- **Persona System**: AI opponents with "Big Five" personality traits.
- **Stockfish Integration** (Experimental): Wraps `stockfish.js` to provide strong chess moves.

## Development & Demos

These tools are included for verifying and debugging the engine.

### Interactive Play (Standard Chess)
Play against the engine in your terminal.
```bash
bun run src/app/interactive-game.ts
```

### AI Demonstrations
Watch AI personalities battle.
```bash
bun run demo/ai-game.demo.ts chaotic
```

### Historical Replays
Watch the engine replay famous games.
```bash
bun run demo/immortal-game.demo.ts
```

## Gallery

![Showcase](showcase.png)
![Showcase 1](showcase1.png)
![Showcase 2](showcase2.png)

## Architecture

- `src/chess-board.ts`: Underlying 1D byte-array grid storage.
- `src/chess-engine.ts`: Stateless pure functions for move logic (`isValidMove`, `applyMove`).
- `src/chess-notation.ts`: Parser for Standard Algebraic Notation.
- `src/persona/`: Logic for AI personalities and Stockfish interface.

## Limitations

### Stockfish Dependencies
The `StockfishWorker` relies on specific file paths within `node_modules` and uses fragile runtime patching. If `stockfish.js` files are missing, AI features may fail.

## Contributing

I am looking for help! Please check the `tests` folder to see how to add new scenarios.

( *Documentation created with AI* )