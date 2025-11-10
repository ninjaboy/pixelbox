/**
 * CombustionBehaviors.js
 * Reusable combustion and burning behaviors
 * Eliminates code duplication for fire spreading, ignition, and burning mechanics
 */

import { TAG } from '../ElementProperties.js';

/**
 * BurningBehavior - For elements that actively burn and spread fire
 * Implements progressive burning with fire spreading mechanics
 */
export class BurningBehavior {
    constructor(options = {}) {
        this.lifetime = options.lifetime || 3000; // frames until burnout
        this.spreadChance = options.spreadChance || 0.15; // base chance to spread fire
        this.spreadIntensity = options.spreadIntensity || 1.0; // spread range multiplier
        this.burnsInto = options.burnsInto || 'ash'; // what element becomes after burning
    }

    apply(x, y, grid, cell) {
        // Initialize burn progress
        if (cell.data.burnProgress === undefined) {
            cell.data.burnProgress = 0;
            cell.data.lifetime = this.lifetime; // Store lifetime for other behaviors
        }

        // Increment burn progress
        cell.data.burnProgress++;

        // Calculate burn stage (0-1)
        const burnStage = cell.data.burnProgress / this.lifetime;

        // Burnout - element consumed
        if (cell.data.burnProgress >= this.lifetime) {
            grid.setElement(x, y, grid.registry.get(this.burnsInto));
            return true;
        }

        // Fire spreading - more aggressive in early/mid stages
        const spreadModifier = burnStage < 0.66 ? 1.0 : 0.3; // slow down near end
        const effectiveSpreadChance = this.spreadChance * spreadModifier;

        if (Math.random() < effectiveSpreadChance) {
            // Get neighboring positions
            const directions = [
                [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
            ];

            // Randomize direction order
            directions.sort(() => Math.random() - 0.5);

            for (const [nx, ny] of directions) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.COMBUSTIBLE)) {
                    // Ignite neighbor
                    const ignited = neighbor.burnsInto
                        ? grid.registry.get(neighbor.burnsInto)
                        : grid.registry.get('fire');
                    grid.setElement(nx, ny, ignited);
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * EmissionBehavior - For elements that emit other elements (fire, smoke, etc.)
 * Implements staged emission with variable intensity
 */
export class EmissionBehavior {
    constructor(options = {}) {
        this.emitElement = options.emitElement || 'fire'; // what to emit
        this.emissionRate = options.emissionRate || 0.15; // base emission chance
        this.stages = options.stages || null; // emission stages [{ until: 0.33, rate: 0.15 }, ...]
        this.directions = options.directions || [[0, -1]]; // where to emit (default: up)
        this.requiresEmpty = options.requiresEmpty !== false; // only emit into empty space
    }

    apply(x, y, grid, cell) {
        // Calculate emission rate based on stages
        let currentRate = this.emissionRate;

        if (this.stages && cell.data.burnProgress !== undefined && cell.data.lifetime) {
            const progress = cell.data.burnProgress / cell.data.lifetime;

            // Find matching stage
            for (const stage of this.stages) {
                if (progress < stage.until) {
                    currentRate = stage.rate;
                    break;
                }
            }
        }

        // Emit element
        if (Math.random() < currentRate) {
            // Try each direction
            for (const [dx, dy] of this.directions) {
                const targetX = x + dx;
                const targetY = y + dy;

                if (this.requiresEmpty && !grid.isEmpty(targetX, targetY)) {
                    continue;
                }

                if (!this.requiresEmpty || grid.isEmpty(targetX, targetY)) {
                    grid.setElement(targetX, targetY, grid.registry.get(this.emitElement));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * IgnitionBehavior - For elements that can ignite combustibles nearby
 * Implements heat-based ignition with resistance calculation
 */
export class IgnitionBehavior {
    constructor(options = {}) {
        this.ignitionChance = options.ignitionChance || 0.2; // base ignition probability
        this.range = options.range || 1; // how far to check (1 = adjacent only)
        this.checkDiagonals = options.checkDiagonals !== false;
    }

    apply(x, y, grid) {
        // Build neighbor list
        const neighbors = [];

        // Cardinal directions
        if (this.range >= 1) {
            neighbors.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
        }

        // Diagonals
        if (this.checkDiagonals && this.range >= 1) {
            neighbors.push(
                [x - 1, y - 1], [x + 1, y - 1],
                [x - 1, y + 1], [x + 1, y + 1]
            );
        }

        // Extended range (2+ cells away)
        if (this.range >= 2) {
            neighbors.push(
                [x, y - 2], [x, y + 2], [x - 2, y], [x + 2, y]
            );
        }

        // Randomize order
        neighbors.sort(() => Math.random() - 0.5);

        // Try to ignite combustible neighbors
        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);

            if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.COMBUSTIBLE)) {
                // Calculate effective ignition chance based on resistance
                const resistanceFactor = 1 - (neighbor.ignitionResistance || 0);
                const effectiveChance = this.ignitionChance * resistanceFactor;

                if (Math.random() < effectiveChance) {
                    // Ignite
                    const ignited = neighbor.burnsInto
                        ? grid.registry.get(neighbor.burnsInto)
                        : grid.registry.get('fire');
                    grid.setElement(nx, ny, ignited);
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * ProximityIgnitionBehavior - For highly flammable elements that ignite from nearby heat
 * Used for oil, gunpowder, etc.
 */
export class ProximityIgnitionBehavior {
    constructor(options = {}) {
        this.detectionRange = options.detectionRange || 1; // how far to detect heat sources
        this.ignitionChance = options.ignitionChance || 0.5; // probability when near heat
        this.transformInto = options.transformInto || 'fire'; // what to become
        this.checkInterval = options.checkInterval || 1; // check every N frames
    }

    apply(x, y, grid, cell) {
        // Throttle checking for performance
        if (cell.data.ignitionCheckFrame === undefined) {
            cell.data.ignitionCheckFrame = 0;
        }

        cell.data.ignitionCheckFrame++;
        if (cell.data.ignitionCheckFrame < this.checkInterval) {
            return false;
        }
        cell.data.ignitionCheckFrame = 0;

        // Check for nearby heat sources
        for (let dy = -this.detectionRange; dy <= this.detectionRange; dy++) {
            for (let dx = -this.detectionRange; dx <= this.detectionRange; dx++) {
                if (dx === 0 && dy === 0) continue;

                const neighbor = grid.getElement(x + dx, y + dy);
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.HEAT_SOURCE)) {
                    if (Math.random() < this.ignitionChance) {
                        grid.setElement(x, y, grid.registry.get(this.transformInto));
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
