/**
 * CombustionBehaviors.js
 * Reusable combustion and burning behaviors
 * Eliminates code duplication for fire spreading, ignition, and burning mechanics
 */

import { TAG } from '../ElementProperties.js';

/**
 * BurningBehavior - For elements that actively burn and spread fire
 * Implements progressive burning with fire spreading mechanics
 *
 * Used by: BurningWoodElement
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.lifetime=3000] - Frames until burnout (at 60fps: 3000 = 50 seconds)
 * @param {number} [options.spreadChance=0.15] - Base probability to spread fire per frame (0-1)
 * @param {number} [options.spreadIntensity=1.0] - Spread range multiplier (currently unused)
 * @param {string} [options.burnsInto='ash'] - Element name to transform into after burning
 *
 * @example
 * // Burning wood that slowly burns for 15 seconds and becomes ash
 * this.addBehavior(new BurningBehavior({
 *     lifetime: 900,
 *     spreadChance: 0.15,
 *     burnsInto: 'ash'
 * }));
 */
export class BurningBehavior {
    constructor(options = {}) {
        this.lifetime = options.lifetime || 3000;
        this.spreadChance = options.spreadChance || 0.15;
        this.spreadIntensity = options.spreadIntensity || 1.0;
        this.burnsInto = options.burnsInto || 'ash';
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
 * Implements staged emission with variable intensity based on lifecycle
 *
 * Used by: BurningWoodElement, LavaElement
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.emitElement='fire'] - Element type to emit
 * @param {number} [options.emissionRate=0.15] - Base emission probability per frame (0-1)
 * @param {Array} [options.stages=null] - Emission stages array: [{ until: 0.33, rate: 0.15 }, ...]
 *        Stages allow changing emission rate based on burn progress (0-1)
 * @param {Array<Array<number>>} [options.directions=[[0,-1]]] - Emission directions as [dx, dy] offsets
 *        Default [[0,-1]] = upward. Can specify multiple: [[-1,-1], [1,-1]] = up-left and up-right
 * @param {boolean} [options.requiresEmpty=true] - Only emit into empty space
 *
 * @example
 * // Fire that gets stronger, then weaker
 * this.addBehavior(new EmissionBehavior({
 *     emitElement: 'fire',
 *     directions: [[0, -1]],
 *     stages: [
 *         { until: 0.33, rate: 0.15 }, // early: weak
 *         { until: 0.66, rate: 0.20 }, // peak: strong
 *         { until: 1.0, rate: 0.07 }   // late: dying
 *     ]
 * }));
 */
export class EmissionBehavior {
    constructor(options = {}) {
        this.emitElement = options.emitElement || 'fire';
        this.emissionRate = options.emissionRate || 0.15;
        this.stages = options.stages || null;
        this.directions = options.directions || [[0, -1]];
        this.requiresEmpty = options.requiresEmpty !== false;
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
 *
 * Used by: LavaElement
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.ignitionChance=0.2] - Base ignition probability per frame (0-1)
 *        Actual chance is modified by target's ignitionResistance property
 * @param {number} [options.range=1] - How far to check for combustibles (1 = adjacent cells only)
 * @param {boolean} [options.checkDiagonals=true] - Include diagonal neighbors in ignition check
 *
 * @example
 * // Lava that ignites adjacent combustibles
 * this.addBehavior(new IgnitionBehavior({
 *     ignitionChance: 0.2,  // 20% base chance
 *     range: 1,
 *     checkDiagonals: false // only cardinal directions
 * }));
 */
export class IgnitionBehavior {
    constructor(options = {}) {
        this.ignitionChance = options.ignitionChance || 0.2;
        this.range = options.range || 1;
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
 * Automatically scans for heat sources and ignites the element
 *
 * Used by: OilElement
 *
 * @param {Object} options - Configuration options
 * @param {number} [options.detectionRange=1] - How far to detect heat sources (cells)
 * @param {number} [options.ignitionChance=0.5] - Probability when near heat source (0-1)
 * @param {string} [options.transformInto='fire'] - Element to transform into when ignited
 * @param {number} [options.checkInterval=1] - Check every N frames (for performance throttling)
 *
 * @example
 * // Oil that ignites from nearby heat
 * this.addBehavior(new ProximityIgnitionBehavior({
 *     detectionRange: 1,
 *     ignitionChance: 0.5,
 *     transformInto: 'fire',
 *     checkInterval: 20  // check every 20 frames
 * }));
 */
export class ProximityIgnitionBehavior {
    constructor(options = {}) {
        this.detectionRange = options.detectionRange || 1;
        this.ignitionChance = options.ignitionChance || 0.5;
        this.transformInto = options.transformInto || 'fire';
        this.checkInterval = options.checkInterval || 1;
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
