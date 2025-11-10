/**
 * TransformationBehaviors.js
 * Reusable state transformation behaviors
 * Handles melting, freezing, evaporation, condensation, and other state changes
 */

import { TAG } from '../ElementProperties.js';

/**
 * HeatTransformationBehavior - Transforms when adjacent to heat sources
 * Used for ice melting, sand melting into glass, etc.
 */
export class HeatTransformationBehavior {
    constructor(options = {}) {
        this.transformInto = options.transformInto || 'water'; // default transformation
        this.transformChance = options.transformChance || 0.05; // probability per frame
        this.requiredTag = options.requiredTag || TAG.HEAT_SOURCE; // what triggers transformation
        this.checkDiagonals = options.checkDiagonals !== false;
    }

    apply(x, y, grid) {
        // Check adjacent cells for heat sources
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        if (this.checkDiagonals) {
            neighbors.push(
                [x - 1, y - 1], [x + 1, y - 1],
                [x - 1, y + 1], [x + 1, y + 1]
            );
        }

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.hasTag && neighbor.hasTag(this.requiredTag)) {
                if (Math.random() < this.transformChance) {
                    grid.setElement(x, y, grid.registry.get(this.transformInto));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * ColdTransformationBehavior - Transforms when adjacent to freezing elements
 * Used for water freezing, etc.
 */
export class ColdTransformationBehavior {
    constructor(options = {}) {
        this.transformInto = options.transformInto || 'ice';
        this.transformChance = options.transformChance || 0.05;
        this.requiredTag = options.requiredTag || TAG.FREEZING;
        this.checkDiagonals = options.checkDiagonals !== false;
    }

    apply(x, y, grid) {
        // Check adjacent cells for cold sources
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        if (this.checkDiagonals) {
            neighbors.push(
                [x - 1, y - 1], [x + 1, y - 1],
                [x - 1, y + 1], [x + 1, y + 1]
            );
        }

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.hasTag && neighbor.hasTag(this.requiredTag)) {
                if (Math.random() < this.transformChance) {
                    grid.setElement(x, y, grid.registry.get(this.transformInto));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * MeltingBehavior - For hot elements that melt specific materials they touch
 * Used by lava to melt sand into glass, ice into steam, etc.
 */
export class MeltingBehavior {
    constructor(options = {}) {
        this.meltingRules = options.meltingRules || []; // [{ target: 'sand', result: 'glass', chance: 0.7 }, ...]
        this.checkBelow = options.checkBelow !== false; // check below by default
        this.checkDiagonals = options.checkDiagonals || false;
        this.checkCardinal = options.checkCardinal || false;
    }

    apply(x, y, grid) {
        const positions = [];

        // Below
        if (this.checkBelow) {
            positions.push([x, y + 1]);
        }

        // Diagonal below
        if (this.checkDiagonals) {
            positions.push([x - 1, y + 1], [x + 1, y + 1]);
        }

        // Cardinal directions
        if (this.checkCardinal) {
            positions.push([x - 1, y], [x + 1, y], [x, y - 1]);
        }

        // Check each position
        for (const [nx, ny] of positions) {
            const neighbor = grid.getElement(nx, ny);
            if (!neighbor) continue;

            // Check melting rules
            for (const rule of this.meltingRules) {
                if (neighbor.name === rule.target) {
                    const chance = rule.chance !== undefined ? rule.chance : 1.0;

                    if (Math.random() < chance) {
                        // Handle multiple possible results
                        let result = rule.result;
                        if (Array.isArray(rule.result)) {
                            // Pick random result from array
                            result = rule.result[Math.floor(Math.random() * rule.result.length)];
                        }

                        grid.setElement(nx, ny, grid.registry.get(result));
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

/**
 * FreezingPropagationBehavior - Spreads freezing to adjacent water
 * Used by ice to freeze nearby water
 */
export class FreezingPropagationBehavior {
    constructor(options = {}) {
        this.targetElement = options.targetElement || 'water';
        this.freezeInto = options.freezeInto || 'ice';
        this.freezeChance = options.freezeChance || 0.03;
        this.checkDiagonals = options.checkDiagonals !== false;
    }

    apply(x, y, grid) {
        // Check adjacent cells
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        if (this.checkDiagonals) {
            neighbors.push(
                [x - 1, y - 1], [x + 1, y - 1],
                [x - 1, y + 1], [x + 1, y + 1]
            );
        }

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === this.targetElement) {
                if (Math.random() < this.freezeChance) {
                    grid.setElement(nx, ny, grid.registry.get(this.freezeInto));
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * CorrosionBehavior - Dissolves/corrodes specific materials
 * Used by acid to dissolve organic matter, metals, etc.
 */
export class CorrosionBehavior {
    constructor(options = {}) {
        this.corrosionRules = options.corrosionRules || []; // [{ tag: TAG.ORGANIC, chance: 0.3, result: 'empty' }, ...]
        this.checkDiagonals = options.checkDiagonals || false;
        this.emitByproduct = options.emitByproduct || null; // e.g., 'smoke' when corroding
        this.byproductChance = options.byproductChance || 0.5;
    }

    apply(x, y, grid) {
        // Check adjacent cells
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        if (this.checkDiagonals) {
            neighbors.push(
                [x - 1, y - 1], [x + 1, y - 1],
                [x - 1, y + 1], [x + 1, y + 1]
            );
        }

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (!neighbor) continue;

            // Check corrosion rules
            for (const rule of this.corrosionRules) {
                let matches = false;

                // Check by tag
                if (rule.tag && neighbor.hasTag && neighbor.hasTag(rule.tag)) {
                    matches = true;
                }

                // Check by name
                if (rule.target && neighbor.name === rule.target) {
                    matches = true;
                }

                if (matches && Math.random() < rule.chance) {
                    // Dissolve target
                    const result = rule.result || 'empty';
                    grid.setElement(nx, ny, grid.registry.get(result));

                    // Emit byproduct (e.g., smoke)
                    if (this.emitByproduct && Math.random() < this.byproductChance) {
                        // Try to emit above the corroded position
                        if (grid.isEmpty(nx, ny - 1)) {
                            grid.setElement(nx, ny - 1, grid.registry.get(this.emitByproduct));
                        }
                    }

                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * TimedTransformationBehavior - Transforms after a certain time/lifetime
 * Used for elements that decay, burnout, or age into something else
 */
export class TimedTransformationBehavior {
    constructor(options = {}) {
        this.lifetime = options.lifetime || 1000; // frames until transformation
        this.transformInto = options.transformInto || 'empty';
        this.variance = options.variance || 0; // random variance in lifetime (0-1)
    }

    apply(x, y, grid, cell) {
        // Initialize timer
        if (cell.data.transformTimer === undefined) {
            const variance = this.variance * this.lifetime * (Math.random() - 0.5);
            cell.data.transformTimer = 0;
            cell.data.transformLifetime = this.lifetime + variance;
        }

        // Increment timer
        cell.data.transformTimer++;

        // Transform when timer expires
        if (cell.data.transformTimer >= cell.data.transformLifetime) {
            grid.setElement(x, y, grid.registry.get(this.transformInto));
            return true;
        }

        return false;
    }
}

/**
 * ConditionalTransformationBehavior - Transforms based on custom conditions
 * Flexible behavior for complex transformation logic
 */
export class ConditionalTransformationBehavior {
    constructor(options = {}) {
        this.condition = options.condition || (() => false); // function(x, y, grid, cell) => boolean
        this.transformInto = options.transformInto || 'empty';
        this.transformChance = options.transformChance || 1.0;
    }

    apply(x, y, grid, cell) {
        if (this.condition(x, y, grid, cell)) {
            if (Math.random() < this.transformChance) {
                grid.setElement(x, y, grid.registry.get(this.transformInto));
                return true;
            }
        }

        return false;
    }
}
