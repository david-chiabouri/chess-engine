/**
 * PersonaAI - Chess AI with Big Five Personality Traits
 * 
 * Each trait is normalized between -1 and 1:
 * - Openness: Creative vs Conventional
 * - Conscientiousness: Careful vs Impulsive  
 * - Extraversion: Active/Attacking vs Passive/Defensive
 * - Agreeableness: Peaceful vs Competitive
 * - Neuroticism: Crumbles vs Stable under pressure
 */

import { StockfishEngine, type AnalysisResult } from './stockfish-engine';

export interface BigFiveTraits {
    /** -1 = Conventional, predictable | +1 = Creative, experimental */
    openness: number;
    /** -1 = Impulsive, fast | +1 = Careful, thorough */
    conscientiousness: number;
    /** -1 = Passive, defensive | +1 = Active, attacking */
    extraversion: number;
    /** -1 = Competitive, draw-averse | +1 = Peaceful, draw-tolerant */
    agreeableness: number;
    /** -1 = Stable under pressure | +1 = Crumbles under pressure (eval-dependent) */
    neuroticism: number;
}

function clamp(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

export interface PersonaAIOptions {
    name: string;
    traits: Partial<BigFiveTraits>;
    baseDepth?: number;      // Base search depth (default: 12)
    baseMovetime?: number;   // Base move time in ms (default: 1000)
}

/**
 * Chess AI with personality-driven behavior using Big Five traits
 */
export class PersonaAI {
    public readonly name: string;
    public readonly traits: BigFiveTraits;

    private engine: StockfishEngine;
    private baseDepth: number;
    private baseMovetime: number;
    private isInitialized: boolean = false;

    constructor(options: PersonaAIOptions) {
        this.name = options.name;
        this.traits = {
            openness: clamp(options.traits.openness ?? 0),
            conscientiousness: clamp(options.traits.conscientiousness ?? 0),
            extraversion: clamp(options.traits.extraversion ?? 0),
            agreeableness: clamp(options.traits.agreeableness ?? 0),
            neuroticism: clamp(options.traits.neuroticism ?? 0),
        };
        this.engine = new StockfishEngine();
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
        // Openness -> MultiPV (more lines = more creative options)
        const multiPV = Math.round(1 + (this.traits.openness + 1) * 2);

        // Conscientiousness -> Skill Level (careful = stronger)
        const skillLevel = Math.round(15 + this.traits.conscientiousness * 5);

        await this.engine.setOptions({
            multiPV: Math.max(1, Math.min(5, multiPV)),
            skillLevel: Math.max(0, Math.min(20, skillLevel)),
        });
    }

    /**
     * Get adjusted search depth based on conscientiousness
     */
    private getAdjustedDepth(): number {
        const multiplier = 1 + this.traits.conscientiousness * 0.5;
        return Math.round(this.baseDepth * multiplier);
    }

    /**
     * Calculate random move probability based on neuroticism and evaluation
     */
    private getNeuroticismProbability(evaluation: number): number {
        if (evaluation >= 0 || this.traits.neuroticism <= 0) {
            return 0;
        }
        const losingSeverity = Math.min(1, Math.abs(evaluation) / 500);
        return Math.max(0, this.traits.neuroticism) * losingSeverity * 0.5;
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
        const randomChance = this.getNeuroticismProbability(result.evaluation);
        if (randomChance > 0 && Math.random() < randomChance) {
            if (result.multiPV && result.multiPV.length > 1) {
                const randomIndex = Math.floor(Math.random() * (result.multiPV.length - 1)) + 1;
                return result.multiPV[randomIndex]?.move ?? result.bestMove;
            }
        }

        return result.bestMove;
    }

    /**
     * Get the persona name
     */
    public getPersonaName(): string {
        return this.name;
    }
}

// === Preset Personas ===

export const AGGRESSIVE_AI = new PersonaAI({
    name: "Aggressive",
    traits: {
        openness: 0.3,
        conscientiousness: -0.5,
        extraversion: 0.9,
        agreeableness: -0.7,
        neuroticism: 0.2,
    }
});

export const CAUTIOUS_AI = new PersonaAI({
    name: "Cautious",
    traits: {
        openness: -0.5,
        conscientiousness: 0.8,
        extraversion: -0.6,
        agreeableness: 0.4,
        neuroticism: -0.5,
    }
});

export const CHAOTIC_AI = new PersonaAI({
    name: "Chaotic",
    traits: {
        openness: 1.0,
        conscientiousness: -0.8,
        extraversion: 0.5,
        agreeableness: -0.3,
        neuroticism: 0.9,
    }
});

export const BALANCED_AI = new PersonaAI({
    name: "Balanced",
    traits: {
        openness: 0,
        conscientiousness: 0,
        extraversion: 0,
        agreeableness: 0,
        neuroticism: 0,
    }
});
