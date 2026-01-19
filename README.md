# Chess Engine

This is my attempt at an open source chess engine that is written in TypeScript and runs on the Bun runtime. We use a static engine function to evaluate the board and make moves. Each chess board can be in any shape and size, and we use a Uint8Array to represent the board's tiles. The PieceType enum is used to represent bit packed information about the pieces.

To install dependencies:

```bash
bun install
```

To run demos:

# Promotion Minigame
A ASCII chess minigame where you try to promote your pawns against an enemy rook.
```bash
bun run demo/promotion-minigame.demo.ts
```

# The ImmortalGame Replay
Replay the Immortal Game from 1851 between Adolf Anderssen and Lionel Kieseritzky.
```bash
bun run demo/immortal-game.demo.ts
```
