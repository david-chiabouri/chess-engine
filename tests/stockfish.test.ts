
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { StockfishEngine } from '../src/persona/stockfish-engine';

describe('Stockfish Engine Integration', () => {
    let engine: StockfishEngine;

    beforeAll(() => {
        engine = new StockfishEngine();
    });

    afterAll(() => {
        engine.stop();
    });

    it('should initialize without error', async () => {
        await engine.start();
        expect(true).toBe(true); // If start() doesn't throw, we are good
    });

    it('should set options', async () => {
        await engine.setOptions({ skillLevel: 10, multiPV: 2 });
        expect(true).toBe(true);
    });

    it('should analyze a starting position', async () => {
        engine.setPosition('startpos');
        const result = await engine.getBestMove({ depth: 5 });

        console.log('Stockfish Result:', result);

        expect(result).toBeDefined();
        expect(result.bestMove).toBeDefined();
        expect(result.bestMove.length).toBeGreaterThanOrEqual(4); // e.g. "e2e4"
        expect(result.evaluation).toBeDefined();
    });

    it('should find mate in 1', async () => {
        // Fool's Mate pattern
        // f3 e5 g4 ??
        engine.setPositionFromMoves(['f2f3', 'e7e5', 'g2g4']);
        const result = await engine.getBestMove({ depth: 5 });

        // Black should play Qh4#
        expect(result.bestMove).toBe('d8h4');
    });
});
