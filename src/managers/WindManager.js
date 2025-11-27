/**
 * WindManager.js - Manages wind direction and strength
 *
 * Responsibilities:
 * - Track wind direction (-1 left, +1 right)
 * - Track wind strength (0-3 scale)
 * - Dynamically vary wind over time
 * - Apply seasonal wind patterns
 * - Provide wind vectors for element movement
 */

import { GAME_CONFIG } from '../config/GameConfig.js';

class WindManager {
    constructor(config = GAME_CONFIG, seasonManager) {
        this.config = config;
        this.seasonManager = seasonManager;

        // Wind state
        this.direction = Math.random() > 0.5 ? 1 : -1;  // -1 (left) or +1 (right)
        this.strength = Math.random() * 2;              // 0-2 initial strength
        this.changeTimer = 0;                           // Frames until next wind change

        // Target state (for smooth transitions)
        this.targetDirection = this.direction;
        this.targetStrength = this.strength;
    }

    /**
     * Update wind state
     * Call this every frame from main game loop
     */
    update(deltaFrames = 1) {
        if (!this.config.WIND_ENABLED) return;

        // Count down to next wind change
        this.changeTimer -= deltaFrames;

        // Time to change wind?
        if (this.changeTimer <= 0) {
            this.generateNewWind();
            this.resetChangeTimer();
        }

        // Smoothly interpolate toward target
        this.smoothTransition(deltaFrames);
    }

    /**
     * Generate new wind direction and strength based on season
     */
    generateNewWind() {
        const season = this.seasonManager.getCurrentSeason();
        const pattern = this.config.WIND_PATTERNS[season] || { strength: 1.0, variability: 1.0 };

        // Calculate new direction (can change or stay same)
        const directionChangeChance = 0.3; // 30% chance to reverse
        if (Math.random() < directionChangeChance) {
            this.targetDirection = -this.targetDirection;
        }

        // Calculate new strength based on seasonal pattern
        const baseStrength = pattern.strength;
        const variability = pattern.variability;

        // Random strength within seasonal range
        const randomFactor = (Math.random() - 0.5) * 2; // -1 to +1
        this.targetStrength = baseStrength + (randomFactor * variability);

        // Clamp to configured range
        this.targetStrength = Math.max(
            this.config.WIND_STRENGTH_RANGE.min,
            Math.min(this.config.WIND_STRENGTH_RANGE.max, this.targetStrength)
        );

        // Occasional gusts (stronger than normal) in autumn/winter
        if ((season === 'autumn' || season === 'winter') && Math.random() < 0.2) {
            this.targetStrength = Math.min(this.config.WIND_STRENGTH_RANGE.max, this.targetStrength + 1.5);
        }

        // Calm periods in summer
        if (season === 'summer' && Math.random() < 0.4) {
            this.targetStrength = 0;
        }
    }

    /**
     * Reset change timer with seasonal variation
     */
    resetChangeTimer() {
        const baseInterval = this.config.WIND_CHANGE_INTERVAL;
        const season = this.seasonManager.getCurrentSeason();

        // Autumn has more variable/gusty wind (shorter intervals)
        if (season === 'autumn') {
            this.changeTimer = baseInterval * (0.5 + Math.random() * 0.5); // 50-100% of base
        }
        // Summer has more stable wind (longer intervals)
        else if (season === 'summer') {
            this.changeTimer = baseInterval * (1.5 + Math.random() * 0.5); // 150-200% of base
        }
        // Default variation
        else {
            this.changeTimer = baseInterval * (0.8 + Math.random() * 0.4); // 80-120% of base
        }
    }

    /**
     * Smoothly transition wind to target values
     */
    smoothTransition(deltaFrames) {
        // Smooth direction change (harder to interpolate -1/+1, so use step)
        if (this.direction !== this.targetDirection) {
            // Gradual direction shift (takes ~10 frames)
            const shiftSpeed = 0.1 * deltaFrames;
            if (Math.abs(this.direction - this.targetDirection) < shiftSpeed) {
                this.direction = this.targetDirection;
            } else {
                this.direction += Math.sign(this.targetDirection - this.direction) * shiftSpeed;
            }
        }

        // Smooth strength change
        const strengthDiff = this.targetStrength - this.strength;
        this.strength += strengthDiff * 0.02 * deltaFrames; // 2% per frame
    }

    /**
     * Get current wind direction (-1 to +1)
     */
    getWindDirection() {
        return this.direction;
    }

    /**
     * Get current wind strength (0-3)
     */
    getWindStrength() {
        return this.strength;
    }

    /**
     * Get wind vector for particle movement
     * Returns { x, y } representing wind force
     */
    getWindVector() {
        return {
            x: this.direction * this.strength * 0.3,  // Horizontal component (scaled down)
            y: 0,                                      // No vertical wind currently
        };
    }

    /**
     * Get wind probability multiplier for horizontal movement
     * Used by clouds and light particles
     * Returns value between 0-1 representing increased movement chance
     */
    getWindProbabilityBoost() {
        return Math.min(1.0, this.strength / 3.0); // 0-1 based on strength
    }

    /**
     * Is it currently windy? (strength > 1.5)
     */
    isWindy() {
        return this.strength > 1.5;
    }

    /**
     * Is it currently calm? (strength < 0.5)
     */
    isCalm() {
        return this.strength < 0.5;
    }

    /**
     * Is wind blowing right (east)?
     */
    isBlowingEast() {
        return this.direction > 0;
    }

    /**
     * Is wind blowing left (west)?
     */
    isBlowingWest() {
        return this.direction < 0;
    }

    /**
     * Get wind description for UI/debug
     */
    getWindDescription() {
        const directionText = this.isBlowingEast() ? 'East' : 'West';
        let strengthText = 'Calm';

        if (this.strength > 2.5) strengthText = 'Strong Gale';
        else if (this.strength > 2.0) strengthText = 'Strong';
        else if (this.strength > 1.5) strengthText = 'Moderate';
        else if (this.strength > 1.0) strengthText = 'Gentle';
        else if (this.strength > 0.5) strengthText = 'Light';

        return `${strengthText} ${directionText}`;
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            direction: this.direction > 0 ? 'East' : 'West',
            strength: this.strength.toFixed(2),
            description: this.getWindDescription(),
            nextChange: Math.ceil(this.changeTimer / 60), // seconds
        };
    }

    /**
     * Serialize state for saving
     */
    serialize() {
        return {
            direction: this.direction,
            strength: this.strength,
            changeTimer: this.changeTimer,
        };
    }

    /**
     * Deserialize state from save
     */
    deserialize(data) {
        if (data.direction !== undefined) this.direction = data.direction;
        if (data.strength !== undefined) {
            this.strength = data.strength;
            this.targetStrength = data.strength;
        }
        if (data.changeTimer !== undefined) this.changeTimer = data.changeTimer;
    }
}

export default WindManager;
