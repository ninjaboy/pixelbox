/**
 * ElementInteractionBehaviors.js
 * Reusable behaviors for complex element-to-element interactions
 * Handles lava-water, lava-sand, water-obsidian, etc.
 */

import { STATE } from '../ElementProperties.js';

/**
 * LavaSandInteractionBehavior
 * Handles lava interacting with sand and wet sand
 * - Wet sand: Dries it first (wet_sand → sand), then burns through
 * - Sand: Pushes down (70%) or glassifies (30%)
 * - Sand on sides: Glassifies (8%) or pushes sideways (15%)
 */
export class LavaSandInteractionBehavior {
    constructor(options = {}) {
        this.pushDownChance = options.pushDownChance || 0.7;
        this.glassifyBelowChance = options.glassifyBelowChance || 0.3;
        this.glassifySideChance = options.glassifySideChance || 0.08;
        this.pushSideChance = options.pushSideChance || 0.15;
        this.dryWetSandChance = options.dryWetSandChance || 0.6; // Chance to dry wet sand
    }

    apply(x, y, grid) {
        // PRIORITY 1: Check below for wet sand - DRY IT FIRST
        const below = grid.getElement(x, y + 1);

        if (below && below.name === 'wet_sand') {
            // Dry the wet sand first (don't immediately burn through)
            if (Math.random() < this.dryWetSandChance) {
                grid.setElement(x, y + 1, grid.registry.get('sand'));
                return true;
            }
            // Otherwise wait (lava doesn't move yet)
            return false;
        }

        // PRIORITY 2: Check below for (now dry) sand - push down or glassify
        if (below && below.name === 'sand') {
            if (Math.random() < this.pushDownChance) {
                // Push sand down, lava sinks
                grid.swap(x, y, x, y + 1);
                return true;
            } else {
                // Glassify sand below
                grid.setElement(x, y + 1, grid.registry.get('glass'));
                return true;
            }
        }

        // PRIORITY 3: Check sides for sand - glassify with occasional pushing
        const directions = [
            [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of directions) {
            const neighbor = grid.getElement(nx, ny);

            if (neighbor && neighbor.name === 'sand') {
                if (Math.random() < this.pushSideChance) {
                    // Sometimes push sand to the side
                    const pushDir = nx < x ? -1 : 1;
                    const pushTarget = grid.getElement(nx + pushDir, ny);

                    if (pushTarget && pushTarget.id === 0) {
                        grid.swap(nx, ny, nx + pushDir, ny);
                        return true;
                    } else {
                        // Can't push, glassify instead
                        grid.setElement(nx, ny, grid.registry.get('glass'));
                        return true;
                    }
                } else if (Math.random() < this.glassifySideChance) {
                    grid.setElement(nx, ny, grid.registry.get('glass'));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * LavaWaterInteractionBehavior
 * Handles lava falling through water
 * - Lava poured onto water: converts to stone/obsidian and continues falling
 * - Evaporates some water as it falls through
 * - Creates realistic "lava bomb" falling through water effect
 */
export class LavaWaterInteractionBehavior {
    constructor(options = {}) {
        this.stoneConversionChance = options.stoneConversionChance || 0.9; // Chance lava becomes stone
        this.obsidianChance = options.obsidianChance || 0.1; // Chance for obsidian instead
        this.evaporateWaterChance = options.evaporateWaterChance || 0.4; // Evaporate water around
    }

    apply(x, y, grid) {
        // Check if lava is falling into/through water
        const below = grid.getElement(x, y + 1);

        if (below && below.name === 'water') {
            // LAVA FALLING THROUGH WATER: Convert to stone and continue falling
            if (Math.random() < this.stoneConversionChance) {
                // Create stone/obsidian that falls through
                const resultElement = Math.random() < this.obsidianChance ? 'obsidian' : 'stone';
                grid.setElement(x, y, grid.registry.get(resultElement));

                // Evaporate some water below
                if (Math.random() < this.evaporateWaterChance) {
                    grid.setElement(x, y + 1, grid.registry.get('steam'));
                }

                return true;
            }
        }

        // Check sides/diagonal for water - create obsidian barrier
        const neighbors = [
            [x - 1, y], [x + 1, y], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // Side contact: high chance to form obsidian
                if (Math.random() < 0.9) {
                    grid.setElement(nx, ny, grid.registry.get('obsidian'));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * WaterLavaInteractionBehavior
 * Handles water interacting with lava and hot obsidian
 * - Water on lava: Forms stone crust (70% chance) or evaporates
 * - Water on hot obsidian: Evaporates while cooling obsidian
 * - Water on cool obsidian: Forms protective stone crust
 */
export class WaterLavaInteractionBehavior {
    constructor(options = {}) {
        this.lavaCrustChance = options.lavaCrustChance || 0.7; // Stone crust formation
        this.lavaEvaporateChance = options.lavaEvaporateChance || 0.3; // Evaporate instead
        this.obsidianCoolRate = options.obsidianCoolRate || 5; // Temperature drop per contact
        this.obsidianCoolThreshold = options.obsidianCoolThreshold || 20; // Cool enough for crust
        this.obsidianCrustChance = options.obsidianCrustChance || 0.4; // Crust formation on cool obsidian
        this.hotObsidianEvaporateChance = options.hotObsidianEvaporateChance || 0.3;
    }

    apply(x, y, grid) {
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);

            // LAVA INTERACTION
            if (neighbor && neighbor.name === 'lava') {
                // Water touching lava: form stone crust or evaporate
                if (Math.random() < this.lavaCrustChance) {
                    // Form stone crust over lava
                    grid.setElement(nx, ny, grid.registry.get('stone'));
                    const crustCell = grid.getCell(nx, ny);
                    if (crustCell) {
                        crustCell.data.isCrust = true;
                    }
                    grid.setElement(x, y, grid.registry.get('steam'));
                    return true;
                } else {
                    // Evaporate without forming crust
                    grid.setElement(x, y, grid.registry.get('steam'));
                    return true;
                }
            }

            // OBSIDIAN COOLING INTERACTION
            if (neighbor && neighbor.name === 'obsidian') {
                const neighborCell = grid.getCell(nx, ny);

                // Initialize obsidian temperature
                if (!neighborCell.data.temperature) {
                    neighborCell.data.temperature = 100; // Hot obsidian
                }

                // Water above obsidian = cooling mechanism
                if (ny === y - 1) { // Water is above obsidian
                    // Cool down the obsidian
                    neighborCell.data.temperature -= this.obsidianCoolRate;

                    // When cool enough, form protective stone crust
                    if (neighborCell.data.temperature <= this.obsidianCoolThreshold) {
                        if (Math.random() < this.obsidianCrustChance) {
                            // Form stone crust above obsidian (where water is)
                            grid.setElement(x, y, grid.registry.get('stone'));
                            const crustCell = grid.getCell(x, y);
                            if (crustCell) {
                                crustCell.data.isCrust = true;
                            }
                            return true;
                        }
                        // Otherwise water stays (obsidian is cool)
                        return false;
                    } else {
                        // Still hot: evaporate water
                        if (Math.random() < this.hotObsidianEvaporateChance) {
                            grid.setElement(x, y, grid.registry.get('steam'));
                            return true;
                        }
                    }
                } else {
                    // Water on sides or below: evaporate if hot
                    if (neighborCell.data.temperature > 50 && Math.random() < 0.2) {
                        grid.setElement(x, y, grid.registry.get('steam'));
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
