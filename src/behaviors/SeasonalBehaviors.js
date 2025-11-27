/**
 * SeasonalBehaviors.js
 * Season-dependent transformation behaviors
 * Handles water surface freezing in winter, seasonal melting rates, etc.
 */

import { GAME_CONFIG } from '../config/GameConfig.js';

/**
 * SurfaceFreezingBehavior - Freezes water surface in winter
 * Only affects top 1-2 layers of water when temperature is below freezing
 */
export class SurfaceFreezingBehavior {
    constructor(options = {}) {
        this.freezeChance = options.freezeChance || GAME_CONFIG.SURFACE_FREEZE_CHANCE;
        this.freezeDepth = options.freezeDepth || GAME_CONFIG.FREEZE_DEPTH;
    }

    apply(x, y, grid) {
        // Check if we have season data
        const seasonData = grid.seasonData;
        if (!seasonData) return false;

        // Only freeze if temperature below 0 (winter)
        if (seasonData.temperature >= 0) return false;

        // Check if this is a water surface (empty/air above)
        const above = grid.getElement(x, y - 1);
        if (!above || above.id !== 0) {
            return false; // Not surface water
        }

        // Check depth - how far down from surface are we?
        let depth = 0;
        for (let dy = -1; dy >= -this.freezeDepth; dy--) {
            const checkAbove = grid.getElement(x, y + dy);
            if (checkAbove && checkAbove.id === 0) {
                depth++;
            } else {
                break;
            }
        }

        // Surface layer has higher freeze chance
        const depthMultiplier = 1.0 / (depth + 1); // Surface = 1.0, depth 1 = 0.5, etc.
        const adjustedChance = this.freezeChance * depthMultiplier;

        // Gradually freeze
        if (Math.random() < adjustedChance) {
            grid.setElement(x, y, grid.registry.get('ice'));
            return true;
        }

        return false;
    }
}

/**
 * SeasonalMeltingBehavior - Melts ice faster in warmer seasons
 * Modifies base melt rate based on current temperature
 */
export class SeasonalMeltingBehavior {
    constructor(options = {}) {
        this.baseMeltChance = options.baseMeltChance || 0.05;
    }

    apply(x, y, grid) {
        // Check if we have season data
        const seasonData = grid.seasonData;
        if (!seasonData) {
            // Fallback to normal melting if no season data
            return this.checkAdjacentHeat(x, y, grid, this.baseMeltChance);
        }

        // Get temperature
        const temp = seasonData.temperature;

        // Winter: no melting (unless very strong heat source)
        if (seasonData.season === 'winter') {
            // Only melt if directly adjacent to fire/lava
            return this.checkAdjacentHeat(x, y, grid, this.baseMeltChance * 0.1);
        }

        // Summer: faster melting
        if (seasonData.season === 'summer') {
            return this.checkAdjacentHeat(x, y, grid, this.baseMeltChance * 3.0);
        }

        // Spring: moderate increase
        if (seasonData.season === 'spring') {
            return this.checkAdjacentHeat(x, y, grid, this.baseMeltChance * 1.5);
        }

        // Autumn: normal melting
        return this.checkAdjacentHeat(x, y, grid, this.baseMeltChance);
    }

    checkAdjacentHeat(x, y, grid, meltChance) {
        // Check adjacent cells for heat sources
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1],
            [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.hasTag && neighbor.hasTag('heat_source')) {
                if (Math.random() < meltChance) {
                    grid.setElement(x, y, grid.registry.get('water'));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * WindDriftBehavior - Makes light particles drift with wind
 * Used for snow, ash, leaves falling
 */
export class WindDriftBehavior {
    constructor(options = {}) {
        this.driftStrength = options.driftStrength || 0.3; // How much wind affects movement
        this.fallPriority = options.fallPriority !== false; // Fall down first, then drift
    }

    apply(x, y, grid) {
        const seasonData = grid.seasonData;
        if (!seasonData || !seasonData.windVector) return false;

        const wind = seasonData.windVector;
        const windDir = seasonData.windDirection; // -1 (left) or +1 (right)

        // Apply wind drift
        if (Math.random() < Math.abs(wind.x) * this.driftStrength) {
            const driftX = windDir > 0 ? 1 : -1;

            // Try to move in wind direction
            if (grid.isEmpty(x + driftX, y)) {
                grid.swap(x, y, x + driftX, y);
                return true;
            }

            // Try diagonal drift (down and sideways)
            if (this.fallPriority && grid.isEmpty(x + driftX, y + 1)) {
                grid.swap(x, y, x + driftX, y + 1);
                return true;
            }
        }

        return false;
    }
}

/**
 * TemperatureBasedSpawn - Spawns elements based on temperature
 * Used for snow vs rain from clouds
 */
export class TemperatureBasedSpawnBehavior {
    constructor(options = {}) {
        this.coldSpawn = options.coldSpawn || 'snow';     // Spawn when temp < 0
        this.warmSpawn = options.warmSpawn || 'water';    // Spawn when temp >= 0
        this.threshold = options.threshold || 0;          // Temperature threshold
    }

    getSpawnElement(grid) {
        const seasonData = grid.seasonData;
        if (!seasonData) return this.warmSpawn;

        // Check temperature
        if (seasonData.temperature < this.threshold) {
            return this.coldSpawn; // Cold: spawn snow
        } else {
            return this.warmSpawn; // Warm: spawn water/rain
        }
    }
}
