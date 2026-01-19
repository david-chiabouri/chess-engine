/**
 * Big Five Personality Traits for AI Personas
 * 
 * Each trait is normalized between -1 and 1:
 * - Openness: Creative vs Conventional
 * - Conscientiousness: Careful vs Impulsive  
 * - Extraversion: Active/Attacking vs Passive/Defensive
 * - Agreeableness: Peaceful vs Competitive
 * - Neuroticism: Crumbles vs Stable under pressure
 */

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

/**
 * Clamp a value between -1 and 1
 */
function clamp(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

/**
 * Represents an AI persona with Big Five personality traits
 */
export class Persona {
    public readonly name: string;
    public readonly traits: BigFiveTraits;

    constructor(name: string, traits: Partial<BigFiveTraits>) {
        this.name = name;
        this.traits = {
            openness: clamp(traits.openness ?? 0),
            conscientiousness: clamp(traits.conscientiousness ?? 0),
            extraversion: clamp(traits.extraversion ?? 0),
            agreeableness: clamp(traits.agreeableness ?? 0),
            neuroticism: clamp(traits.neuroticism ?? 0),
        };
    }

    /**
     * Calculate the random move probability based on neuroticism and board evaluation.
     * Only triggers when losing (eval < 0).
     * @param evaluation - Stockfish evaluation in centipawns (positive = winning)
     * @returns probability between 0 and 1
     */
    public getNeuroticismProbability(evaluation: number): number {
        if (evaluation >= 0 || this.traits.neuroticism <= 0) {
            return 0; // Stable when winning or low neuroticism
        }
        // Scale: neuroticism (0 to 1) × how badly losing (normalized)
        // Cap at 500cp disadvantage for max effect
        const losingSeverity = Math.min(1, Math.abs(evaluation) / 500);
        return Math.max(0, this.traits.neuroticism) * losingSeverity * 0.5; // Max 50% random
    }
}

// === Preset Personas ===

export const AGGRESSIVE_PERSONA = new Persona("Aggressive", {
    openness: 0.3,        // Somewhat creative
    conscientiousness: -0.5, // Faster, less thorough
    extraversion: 0.9,    // Very attacking
    agreeableness: -0.7,  // Draw-averse
    neuroticism: 0.2,     // Slightly unstable
});

export const CAUTIOUS_PERSONA = new Persona("Cautious", {
    openness: -0.5,       // Conventional
    conscientiousness: 0.8, // Very thorough
    extraversion: -0.6,   // Defensive
    agreeableness: 0.4,   // Draw-tolerant
    neuroticism: -0.5,    // Stable
});

export const CHAOTIC_PERSONA = new Persona("Chaotic", {
    openness: 1.0,        // Maximum creativity
    conscientiousness: -0.8, // Very impulsive
    extraversion: 0.5,    // Somewhat attacking
    agreeableness: -0.3,  // Slightly competitive
    neuroticism: 0.9,     // Crumbles easily
});

export const BALANCED_PERSONA = new Persona("Balanced", {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0,
});
