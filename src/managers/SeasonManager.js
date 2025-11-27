/**
 * SeasonManager.js - Manages seasonal cycle and temperature
 *
 * Responsibilities:
 * - Track current season and progress through season
 * - Calculate season-based temperature
 * - Provide season queries for all elements
 * - Trigger smooth season transitions
 * - Manage seasonal visual and behavioral changes
 */

import { GAME_CONFIG, getRandomSeason, getFramesPerSeason, getNextSeason } from '../config/GameConfig.js';

class SeasonManager {
    constructor(config = GAME_CONFIG) {
        this.config = config;

        // Determine starting season
        const startSeason = config.START_SEASON === 'random'
            ? getRandomSeason()
            : config.START_SEASON;

        // Season state
        this.currentSeason = startSeason;
        this.seasonTime = 0;                    // Frames elapsed in current season
        this.seasonLength = getFramesPerSeason(); // Total frames per season
        this.seasonProgress = 0;                // 0-1 progress through current season

        // Temperature state
        this.currentTemp = this.getSeasonalTemp(startSeason, 0.5); // Start mid-season
        this.targetTemp = this.currentTemp;

        // Transition state
        this.isTransitioning = false;
        this.transitionProgress = 0;

        console.log(`🌍 Season System initialized - Starting season: ${startSeason}`);
        console.log(`📅 Season length: ${this.seasonLength} frames (~${Math.floor(this.seasonLength / 60 / 60)} minutes)`);
    }

    /**
     * Update season state
     * Call this every frame from main game loop
     */
    update(deltaFrames = 1) {
        // Advance time
        this.seasonTime += deltaFrames;
        this.seasonProgress = this.seasonTime / this.seasonLength;

        // Check for season transition
        if (this.seasonTime >= this.seasonLength) {
            this.advanceSeason();
        }

        // Update temperature (smooth transition)
        this.updateTemperature(deltaFrames);

        // Update transition state
        if (this.isTransitioning) {
            this.transitionProgress += 0.01; // Gradual transition over 100 frames
            if (this.transitionProgress >= 1.0) {
                this.isTransitioning = false;
                this.transitionProgress = 0;
            }
        }
    }

    /**
     * Advance to next season
     */
    advanceSeason() {
        const previousSeason = this.currentSeason;
        this.currentSeason = getNextSeason(this.currentSeason);
        this.seasonTime = 0;
        this.seasonProgress = 0;
        this.isTransitioning = true;
        this.transitionProgress = 0;

        // Update target temperature for new season
        this.targetTemp = this.getSeasonalTemp(this.currentSeason, 0.5);

        console.log(`🍂 Season changed: ${previousSeason} → ${this.currentSeason}`);
    }

    /**
     * Update temperature (smooth transitions)
     */
    updateTemperature(deltaFrames) {
        // Calculate target temperature based on season and progress
        this.targetTemp = this.getSeasonalTemp(this.currentSeason, this.seasonProgress);

        // Smoothly interpolate current temp toward target
        const tempDiff = this.targetTemp - this.currentTemp;
        this.currentTemp += tempDiff * this.config.TEMP_TRANSITION_SPEED * deltaFrames;
    }

    /**
     * Get temperature for a specific season and progress
     * Returns value between -1 (freezing) and 1 (hot)
     */
    getSeasonalTemp(season, progress) {
        const tempRange = this.config.TEMPERATURE[season];
        if (!tempRange) {
            console.warn(`Unknown season: ${season}`);
            return 0.5;
        }

        // Interpolate between min and max based on progress through season
        // Early season = closer to previous season temp
        // Late season = closer to next season temp
        const { min, max } = tempRange;
        const midTemp = (min + max) / 2;

        // Sinusoidal variation through the season
        const variation = Math.sin(progress * Math.PI) * (max - min) / 2;
        return midTemp + variation;
    }

    /**
     * Get current season name
     */
    getCurrentSeason() {
        return this.currentSeason;
    }

    /**
     * Get current temperature (-1 to 1)
     */
    getTemperature() {
        return this.currentTemp;
    }

    /**
     * Get season progress (0-1)
     */
    getSeasonProgress() {
        return this.seasonProgress;
    }

    /**
     * Check if currently transitioning between seasons
     */
    isSeasonTransitioning() {
        return this.isTransitioning;
    }

    /**
     * Get transition progress (0-1)
     */
    getTransitionProgress() {
        return this.transitionProgress;
    }

    /**
     * Should water freeze? (temperature below 0)
     */
    shouldFreeze() {
        return this.currentTemp < 0;
    }

    /**
     * Should ice melt faster? (warm temperature)
     */
    shouldMelt() {
        return this.currentTemp > 0.5;
    }

    /**
     * Get seasonal leaf color (random from pool)
     */
    getLeafColor(season = this.currentSeason) {
        const colors = this.config.LEAF_COLORS[season];
        if (!colors || colors.length === 0) {
            return this.config.LEAF_COLORS.summer[0]; // Default to green
        }
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Get tree growth multiplier for current season
     */
    getTreeGrowthMultiplier() {
        return this.config.TREE_GROWTH_MULTIPLIER[this.currentSeason] || 1.0;
    }

    /**
     * Get tree decay chance for current season
     */
    getTreeDecayChance() {
        return this.config.TREE_DECAY_CHANCE[this.currentSeason] || 0.0;
    }

    /**
     * Get leaf fall rate for current season
     */
    getLeafFallRate() {
        return this.config.LEAF_FALL_RATE[this.currentSeason] || 0.0;
    }

    /**
     * Get cloud spawn multiplier for current season
     */
    getCloudSpawnMultiplier() {
        return this.config.CLOUD_SPAWN_MULTIPLIER[this.currentSeason] || 1.0;
    }

    /**
     * Should spawn snow clouds instead of rain clouds?
     */
    shouldSpawnSnowClouds() {
        return this.currentSeason === 'winter' && Math.random() < this.config.SNOW_CLOUD_CHANCE;
    }

    /**
     * Get ice melt multiplier for current season
     */
    getIceMeltMultiplier() {
        return this.config.ICE_MELT_MULTIPLIER[this.currentSeason] || 1.0;
    }

    /**
     * Should birds be migrating? (autumn, past migration point)
     */
    shouldBirdsMigrate() {
        return this.currentSeason === 'autumn' && this.seasonProgress > this.config.MIGRATION_START;
    }

    /**
     * Is it winter? (no birds present)
     */
    isWinter() {
        return this.currentSeason === 'winter';
    }

    /**
     * Is it early spring? (birds return)
     */
    isEarlySpring() {
        return this.currentSeason === 'spring' && this.seasonProgress < 0.2;
    }

    /**
     * Get sky tint for current season
     */
    getSkyTint() {
        return this.config.SKY_TINT[this.currentSeason] || { r: 1.0, g: 1.0, b: 1.0 };
    }

    /**
     * Get sun tint for current season
     */
    getSunTint() {
        return this.config.SUN_TINT[this.currentSeason] || { r: 1.0, g: 1.0, b: 1.0 };
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            season: this.currentSeason,
            progress: `${(this.seasonProgress * 100).toFixed(1)}%`,
            temperature: this.currentTemp.toFixed(2),
            transitioning: this.isTransitioning,
            freezing: this.shouldFreeze(),
            melting: this.shouldMelt(),
        };
    }

    /**
     * Serialize state for saving
     */
    serialize() {
        return {
            currentSeason: this.currentSeason,
            seasonTime: this.seasonTime,
            currentTemp: this.currentTemp,
        };
    }

    /**
     * Deserialize state from save
     */
    deserialize(data) {
        if (data.currentSeason) {
            this.currentSeason = data.currentSeason;
        }
        if (data.seasonTime !== undefined) {
            this.seasonTime = data.seasonTime;
            this.seasonProgress = this.seasonTime / this.seasonLength;
        }
        if (data.currentTemp !== undefined) {
            this.currentTemp = data.currentTemp;
            this.targetTemp = data.currentTemp;
        }
        console.log(`🌍 Season state loaded: ${this.currentSeason} (${(this.seasonProgress * 100).toFixed(1)}%)`);
    }
}

export default SeasonManager;
