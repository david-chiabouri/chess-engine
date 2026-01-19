# Chess Engine

A flexible, open-source chess engine written in TypeScript for the Bun runtime. Features a modular architecture supporting custom board sizes, personality-driven AI opponents, and a terminal-based UI.

## Features

- **Flexible Board System**: Any board size (not just 8x8), with bit-packed tile representation
- **Full Move Validation**: Castling, en passant, pawn promotion, check detection
- **Standard Algebraic Notation (SAN)**: Parse and generate human-readable moves
- **FEN Support**: Convert game states to/from Forsyth–Edwards Notation
- **Personality AI**: Stockfish-powered AI with Big Five personality traits
- **Terminal UI**: Interactive chess games with blessed-based TUI
- **Game Replay**: Step through historical games move by move

## Installation

```bash
bun install
```

## Quick Start

### Play an Interactive Game
```bash
bun run src/app/interactive-game.ts
```

### Play Against AI
```bash
bun run demo/ai-game.demo.ts aggressive  # or: cautious, chaotic, balanced
```

### Watch the Immortal Game
```bash
bun run demo/immortal-game.demo.ts
```

---

## Architecture

```
src/
├── chess-board.ts       # ChessBoard class - flexible tile storage
├── chess-engine.ts      # ChessEngine - move validation, game state
├── chess-notation.ts    # SAN parsing and generation
├── piece-type.enums.ts  # Bit-packed piece type definitions
├── app/
│   ├── app.ts           # ChessTui - base terminal UI class
│   ├── game-controller.ts # GameController - shared game logic
│   ├── game-replay.ts   # GameReplay - step through moves
│   └── interactive-game.ts # InteractiveGame - live play
└── persona/
    ├── persona-ai.ts    # PersonaAI - AI with personality traits
    └── stockfish-engine.ts # Stockfish.js wrapper
```

---

## Core Modules

### ChessBoard

Flexible board storage using `Uint8Array` with bit-packed tiles.

```typescript
import { ChessBoard } from './src/chess-board';
import { PieceType } from './src/piece-type.enums';

// Create a 5x8 board
const board = new ChessBoard({ width: 5, height: 8 });

// Set pieces (x, y, piece, owner)
board.setTile(0, 0, PieceType.Rook, 2);   // Black rook at a8
board.setTile(4, 7, PieceType.King, 1);   // White king at e1

// Read tiles
const tile = board.getTile(0, 0);
console.log(tile.piece, tile.owner_identifier);
```

### ChessEngine

Static methods for game state management and move validation.

```typescript
import { ChessEngine } from './src/chess-engine';

// Create a new game
const gameState = ChessEngine.newGame(board, [
    { team_identifier: 1, player_identifiers: [1] },  // White
    { team_identifier: 2, player_identifiers: [2] }   // Black
]);

// Validate a move
const valid = ChessEngine.isValidMove(gameState, 4, 6, 4, 4);  // e2 to e4

// Apply a move
const move = { fromX: 4, fromY: 6, toX: 4, toY: 4 };
const newState = ChessEngine.applyMove(gameState, move);

// Convert to FEN
const fen = ChessEngine.toFEN(gameState);

// Parse UCI move (e.g., from Stockfish)
const uciMove = ChessEngine.uciToMove("e2e4");
```

### ChessNotation

Parse and generate Standard Algebraic Notation.

```typescript
import { ChessNotation } from './src/chess-notation';

// Parse SAN to move object
const move = ChessNotation.parseMove(gameState, "Nf3");

// Convert move to SAN
const san = ChessNotation.moveToSAN(move, gameState);
```

---

## Terminal UI

### GameController

Base class for game modes with command handling, undo, and history.

```typescript
import { GameController } from './src/app/game-controller';

class MyGame extends GameController {
    protected handleCommand(cmd: string): void {
        if (this.applyMove(cmd)) {
            this.log(`Move applied: ${cmd}`);
            this.renderBoard();
        }
    }
    
    public run(): void {
        this.log("Welcome to my game!");
    }
}
```

**Built-in Commands**: `undo`, `restart`, `help`, `exit`

### InteractiveGame

Play chess interactively in the terminal.

```bash
bun run src/app/interactive-game.ts
```

### GameReplay

Step through a series of moves with playback controls.

```typescript
import { GameReplay } from './src/app/game-replay';

const replay = new GameReplay([
    "e4", "e5", "Nf3", "Nc6", "Bb5"
]);
replay.start();
```

**Controls**: `next`, `prev`, `play`, `pause`, `restart`

---

## AI System

### PersonaAI

AI opponents with Big Five personality traits that modify playing style.

```typescript
import { PersonaAI, AGGRESSIVE_AI, BALANCED_AI } from './src/persona/persona-ai';

// Use preset
const ai = AGGRESSIVE_AI;

// Or create custom
const myAI = new PersonaAI({
    name: "Nervous Nellie",
    traits: {
        openness: 0.2,          // Conventional
        conscientiousness: 0.5, // Careful
        extraversion: -0.3,     // Defensive
        agreeableness: 0.1,     // Neutral
        neuroticism: 0.8        // Cracks under pressure
    }
});

await ai.initialize();
const bestMove = await ai.getBestMove(fenString);
ai.shutdown();
```

### Trait Effects

| Trait | Low (-1) | High (+1) | Engine Effect |
|-------|----------|-----------|---------------|
| Openness | Conventional | Creative | MultiPV lines analyzed |
| Conscientiousness | Impulsive | Careful | Search depth |
| Extraversion | Defensive | Attacking | Move selection bias |
| Agreeableness | Competitive | Peaceful | Draw tolerance |
| Neuroticism | Stable | Unstable | Random moves when losing |

### Preset Personalities

- `AGGRESSIVE_AI` - Attacking, impatient
- `CAUTIOUS_AI` - Defensive, methodical
- `CHAOTIC_AI` - Unpredictable, creative
- `BALANCED_AI` - Neutral baseline

---

## Demos

### Promotion Minigame
5x8 board where White (King + 3 Pawns) tries to promote against Black's Rook.
```bash
bun run demo/promotion-minigame.demo.ts
```

### Immortal Game Replay
The famous 1851 game between Anderssen and Kieseritzky.
```bash
bun run demo/immortal-game.demo.ts
```

### AI Game
Play against a personality-driven AI.
```bash
bun run demo/ai-game.demo.ts chaotic
```

---

## Examples

See the `examples/` directory for more usage patterns:

- `examples/basic-game.ts` - Set up and play a game programmatically
- `examples/custom-board.ts` - Create non-standard board sizes
- `examples/ai-match.ts` - Two AIs play against each other

---

## Running Tests

```bash
bun test
```

---

## License

GNU General Public License v3.0
