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
        this.pushDownChance = options.pushDownChance || 0.92; // Increased from 0.7 (now mostly pushes)
        this.glassifyBelowChance = options.glassifyBelowChance || 0.08; // Reduced from 0.3 (glass is rare!)
        this.glassifySideChance = options.glassifySideChance || 0.03; // Reduced from 0.08
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
 * Handles lava falling through water with volume conservation
 * - Lava sinks through water (density: lava=8, water=2)
 * - Side contact: BOTH turn to obsidian (1:1 exchange, conserves volume)
 * - Evaporates water as it passes through (lava stays lava, water → steam)
 * - Creates realistic "lava sinking through ocean" effect without mass creation
 */
export class LavaWaterInteractionBehavior {
    constructor(options = {}) {
        this.obsidianSideChance = options.obsidianSideChance || 0.3; // Form obsidian on sides
        this.evaporateWaterChance = options.evaporateWaterChance || 0.2; // Evaporate water around
    }

    apply(x, y, grid) {
        // Check SIDES for water - create obsidian barrier (not below!)
        const sideNeighbors = [
            [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of sideNeighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // Side contact: BOTH turn to obsidian (volume conservation!)
                if (Math.random() < this.obsidianSideChance) {
                    // Water becomes obsidian
                    grid.setElement(nx, ny, grid.registry.get('obsidian'));
                    const obsidianCell = grid.getCell(nx, ny);
                    if (obsidianCell) {
                        obsidianCell.data.temperature = 100;
                    }

                    // VOLUME CONSERVATION: Lava also becomes obsidian
                    grid.setElement(x, y, grid.registry.get('obsidian'));
                    const lavaObsidianCell = grid.getCell(x, y);
                    if (lavaObsidianCell) {
                        lavaObsidianCell.data.temperature = 100;
                    }

                    return true;
                }
                // Or evaporate water (lava stays lava, water → steam)
                else if (Math.random() < this.evaporateWaterChance) {
                    grid.setElement(nx, ny, grid.registry.get('steam'));
                    return true;
                }
            }
        }

        // Check diagonal sides (not below diagonal!)
        const diagonalNeighbors = [
            [x - 1, y - 1], [x + 1, y - 1]
        ];

        for (const [nx, ny] of diagonalNeighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                if (Math.random() < 0.1) { // Lower chance for diagonal
                    // VOLUME CONSERVATION: Both turn to obsidian
                    grid.setElement(nx, ny, grid.registry.get('obsidian'));
                    const obsidianCell = grid.getCell(nx, ny);
                    if (obsidianCell) {
                        obsidianCell.data.temperature = 100;
                    }

                    grid.setElement(x, y, grid.registry.get('obsidian'));
                    const lavaObsidianCell = grid.getCell(x, y);
                    if (lavaObsidianCell) {
                        lavaObsidianCell.data.temperature = 100;
                    }

                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * WaterLavaInteractionBehavior
 * Handles water interacting with hot obsidian (NOT lava - that's handled by InteractionManager + LavaWaterInteractionBehavior)
 * - Water on hot obsidian: Evaporates while cooling obsidian
 * - Water on cool obsidian: Forms protective stone crust
 *
 * NOTE: Obsidian formation is handled by LavaWaterInteractionBehavior to avoid duplication
 */
export class WaterLavaInteractionBehavior {
    constructor(options = {}) {
        // Removed lava interaction options - InteractionManager + LavaWaterInteractionBehavior handle that
        this.obsidianCoolRate = options.obsidianCoolRate || 5; // Temperature drop per contact
        this.obsidianCoolThreshold = options.obsidianCoolThreshold || 20; // Cool enough for crust
        this.obsidianCrustChance = options.obsidianCrustChance || 0.4; // Crust formation on cool obsidian
        this.hotObsidianEvaporateChance = options.hotObsidianEvaporateChance || 0.3;
    }

    apply(x, y, grid) {
        // Check sides for obsidian (lava interaction is handled elsewhere)
        const neighbors = [
            [x - 1, y], // left side
            [x + 1, y], // right side
            [x, y - 1]  // above (for crust formation)
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);

            // OBSIDIAN COOLING INTERACTION
            if (neighbor && neighbor.name === 'obsidian') {
                const neighborCell = grid.getCell(nx, ny);

                // Skip if this is user-placed obsidian (no temperature data)
                // Only interact with hot obsidian created by lava-water
                if (neighborCell.data.temperature === undefined) {
                    continue; // User-placed obsidian - leave it alone
                }

                // Water touching hot obsidian cools it down (any direction)
                // But cooling is faster from above
                const coolingRate = (ny === y - 1) ? this.obsidianCoolRate : this.obsidianCoolRate * 0.5;
                neighborCell.data.temperature -= coolingRate;

                // Water above obsidian = can form stone crust when cool
                if (ny === y - 1) { // Water is above obsidian
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
                    // Water on sides or below: evaporate if still very hot
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
