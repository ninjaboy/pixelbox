/**
 * GameConfig.js - Central configuration for PixelBox game systems
 *
 * This file contains all tunable parameters for:
 * - Time system (days, months, seasons)
 * - Temperature ranges
 * - Wind system
 * - Seasonal modifiers for elements
 *
 * Modify these values to adjust game balance and behavior.
 */

export const GAME_CONFIG = {
    // ===== TIME SYSTEM =====
    // Frame-based time tracking (60 fps target)
    DAY_LENGTH: 1000,               // frames per day (10x faster: ~16 seconds at 60fps)
    MONTH_LENGTH: 1,                // days per month
    SEASON_LENGTH: 3,               // days per season (3 months)

    // ===== SEASONS =====
    SEASONS: ['spring', 'summer', 'autumn', 'winter'],
    START_SEASON: 'random',         // 'random' or specific season name

    // Temperature ranges (normalized -1 to 1 scale)
    // Affects freezing, melting, snow spawning, etc.
    TEMPERATURE: {
        spring: { min: 0.3, max: 0.6 },   // Mild, warming
        summer: { min: 0.7, max: 1.0 },   // Hot
        autumn: { min: 0.3, max: 0.5 },   // Mild, cooling
        winter: { min: -0.5, max: 0.2 },  // Cold, below freezing
    },

    // Temperature transition smoothing
    TEMP_TRANSITION_SPEED: 0.001,   // How quickly temp changes between seasons

    // ===== WIND SYSTEM =====
    WIND_ENABLED: true,
    WIND_CHANGE_INTERVAL: 600,      // frames between wind direction/strength shifts
    WIND_STRENGTH_RANGE: { min: 0, max: 3 },  // 0 = calm, 3 = strong

    // Seasonal wind patterns
    WIND_PATTERNS: {
        spring: { strength: 1.5, variability: 0.8 },  // Gentle, variable
        summer: { strength: 0.5, variability: 0.3 },  // Calm, occasional breeze
        autumn: { strength: 2.5, variability: 1.2 },  // Strong, gusty
        winter: { strength: 2.0, variability: 0.5 },  // Strong, consistent
    },

    // ===== TREE SEASONAL MODIFIERS =====

    // Growth speed multiplier (multiplies TREE_CONFIG.growthDelay)
    TREE_GROWTH_MULTIPLIER: {
        spring: 0.5,    // 2x faster growth
        summer: 1.0,    // normal growth
        autumn: 2.0,    // 2x slower growth
        winter: 999,    // effectively stopped (near-infinite delay)
    },

    // Tree decay chances (per frame)
    TREE_DECAY_CHANCE: {
        spring: 0.0,        // No decay
        summer: 0.0,        // No decay
        autumn: 0.00001,    // Occasional branch fall (0.001%)
        winter: 0.00002,    // More decay (0.002%)
    },

    // Leaf falling rate (per frame)
    LEAF_FALL_RATE: {
        spring: 0.0,        // Leaves don't fall
        summer: 0.0,        // Leaves don't fall
        autumn: 0.002,      // 0.2% chance per frame
        winter: 0.005,      // 0.5% chance per frame (remaining leaves fall)
    },

    // Leaf regrowth in spring
    LEAF_REGROWTH_CHANCE: 0.0001,   // 0.01% per frame in spring
    LEAVES_PER_BRANCH: 3,           // How many leaves spawn per branch

    // ===== SEASONAL LEAF COLORS =====
    LEAF_COLORS: {
        spring: [
            0x90EE90,    // Light green
            0x98FB98,    // Pale green
            0x9ACD32,    // Yellow-green
        ],
        summer: [
            0x228B22,    // Forest green (deep)
            0x2E8B57,    // Sea green
            0x3CB371,    // Medium sea green
        ],
        autumn: [
            0xFFD700,    // Gold
            0xFFA500,    // Orange
            0xFF8C00,    // Dark orange
            0xFF6347,    // Tomato red
            0xFF4500,    // Orange red
            0xDC143C,    // Crimson
        ],
        winter: [
            0x8B7355,    // Brown (dead/withered)
        ],
    },

    // ===== WATER FREEZING =====

    // Surface water freezing in winter
    SURFACE_FREEZE_CHANCE: 0.001,   // 0.1% per frame when temp < 0
    FREEZE_DEPTH: 2,                // How many layers deep water freezes (1-2 cells)

    // Ice melting rates (multiplier on base melt chance)
    ICE_MELT_MULTIPLIER: {
        spring: 1.5,    // 1.5x faster melting
        summer: 3.0,    // 3x faster melting
        autumn: 1.0,    // normal melting
        winter: 0.0,    // no melting (unless very strong heat)
    },

    // ===== WEATHER & CLOUDS =====

    // Cloud spawning modifiers by season
    CLOUD_SPAWN_MULTIPLIER: {
        spring: 1.5,    // More clouds (rainy season)
        summer: 0.5,    // Fewer clouds (clear skies)
        autumn: 1.2,    // Medium cloudiness
        winter: 1.0,    // Normal cloudiness
    },

    // Snow cloud chance in winter
    SNOW_CLOUD_CHANCE: 0.8,         // 80% of clouds in winter are snow clouds

    // ===== BIRD MIGRATION =====

    // When birds start migrating (season progress 0-1)
    MIGRATION_START: 0.5,           // Mid-autumn
    BIRD_SPAWN_SPRING: 5,           // How many birds spawn at spring start

    // ===== VISUAL & ATMOSPHERIC =====

    // Sky color tinting by season (RGB multipliers)
    SKY_TINT: {
        spring: { r: 1.0, g: 1.05, b: 1.1 },   // Slight blue-pink tint
        summer: { r: 1.1, g: 1.1, b: 1.15 },   // Bright vibrant
        autumn: { r: 1.15, g: 1.0, b: 0.9 },   // Warmer, amber
        winter: { r: 0.9, g: 0.95, b: 1.0 },   // Cooler, pale
    },

    // Sun color by season
    SUN_TINT: {
        spring: { r: 1.0, g: 1.0, b: 0.9 },
        summer: { r: 1.1, g: 1.1, b: 1.0 },    // Bright yellow-white
        autumn: { r: 1.05, g: 0.95, b: 0.85 },
        winter: { r: 0.95, g: 0.95, b: 0.9 },  // Pale yellow
    },
};

/**
 * Helper function: Get random season for START_SEASON = 'random'
 */
export function getRandomSeason() {
    const seasons = GAME_CONFIG.SEASONS;
    return seasons[Math.floor(Math.random() * seasons.length)];
}

/**
 * Helper function: Calculate frames per season
 */
export function getFramesPerSeason() {
    return GAME_CONFIG.DAY_LENGTH * GAME_CONFIG.MONTH_LENGTH * GAME_CONFIG.SEASON_LENGTH;
}

/**
 * Helper function: Get season index (0-3)
 */
export function getSeasonIndex(seasonName) {
    return GAME_CONFIG.SEASONS.indexOf(seasonName);
}

/**
 * Helper function: Get next season
 */
export function getNextSeason(currentSeason) {
    const seasons = GAME_CONFIG.SEASONS;
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
}
