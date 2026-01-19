/**
 * Persona-based AI that applies Big Five traits to Stockfish engine
 */

import { StockfishEngine, type AnalysisResult } from './stockfish-engine';
import { Persona } from './persona';

export interface PersonaAIOptions {
    persona: Persona;
    baseDepth?: number;      // Base search depth (default: 12)
    baseMovetime?: number;   // Base move time in ms (default: 1000)
}

export class PersonaAI {
    private engine: StockfishEngine;
    private persona: Persona;
    private baseDepth: number;
    private baseMovetime: number;
    private isInitialized: boolean = false;

    constructor(options: PersonaAIOptions) {
        this.engine = new StockfishEngine();
        this.persona = options.persona;
        this.baseDepth = options.baseDepth ?? 12;
        this.baseMovetime = options.baseMovetime ?? 1000;
    }

    /**
     * Initialize the AI engine
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        await this.engine.start();
        await this.applyPersonalityToEngine();
        this.isInitialized = true;
    }

    /**
     * Shutdown the AI engine
     */
    public shutdown(): void {
        this.engine.stop();
        this.isInitialized = false;
    }

    /**
     * Apply personality traits to engine settings
     */
    private async applyPersonalityToEngine(): Promise<void> {
        const traits = this.persona.traits;

        // Openness -> MultiPV (more lines = more creative options)
        // -1 = 1 line, +1 = 5 lines
        const multiPV = Math.round(1 + (traits.openness + 1) * 2);

        // Conscientiousness -> Skill Level (careful = stronger)
        // -1 = skill 10, +1 = skill 20
        const skillLevel = Math.round(15 + traits.conscientiousness * 5);

        await this.engine.setOptions({
            multiPV: Math.max(1, Math.min(5, multiPV)),
            skillLevel: Math.max(0, Math.min(20, skillLevel)),
        });
    }

    /**
     * Get the adjusted search depth based on conscientiousness
     */
    private getAdjustedDepth(): number {
        // -1 = half depth (impulsive), +1 = 1.5x depth (careful)
        const multiplier = 1 + this.persona.traits.conscientiousness * 0.5;
        return Math.round(this.baseDepth * multiplier);
    }

    /**
     * Get the best move for the current position
     */
    public async getBestMove(fen: string): Promise<string> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.engine.setPosition(fen);

        const depth = this.getAdjustedDepth();
        const result = await this.engine.getBestMove({ depth });

        // Apply neuroticism - random move chance when losing
        const randomChance = this.persona.getNeuroticismProbability(result.evaluation);
        if (randomChance > 0 && Math.random() < randomChance) {
            // Pick a random suboptimal move from MultiPV if available
            if (result.multiPV && result.multiPV.length > 1) {
                const randomIndex = Math.floor(Math.random() * (result.multiPV.length - 1)) + 1;
                return result.multiPV[randomIndex]?.move ?? result.bestMove;
            }
        }

        // Apply extraversion - prefer attacking moves
        // This is a simplified implementation - in reality we'd analyze move types
        // For now, just return the best move
        return result.bestMove;
    }

    /**
     * Get the persona name
     */
    public getPersonaName(): string {
        return this.persona.name;
    }

    /**
     * Get the current persona
     */
    public getPersona(): Persona {
        return this.persona;
    }
}
