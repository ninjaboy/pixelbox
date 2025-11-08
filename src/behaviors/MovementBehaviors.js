/**
 * MovementBehaviors.js
 * Reusable movement behaviors for falling sand simulation
 * Eliminates code duplication across element types
 */

/**
 * GravityBehavior - For powders and solid particles
 * Implements falling with angle of repose (diagonal sliding)
 */
export class GravityBehavior {
    constructor(options = {}) {
        this.fallSpeed = options.fallSpeed || 1; // cells per update
        this.slideAngle = options.slideAngle !== false; // angle of repose enabled
        this.slideStability = options.slideStability || 0.85; // higher = more stable
    }

    apply(x, y, grid) {
        // Priority 1: Fall straight down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Priority 2: Diagonal slide (angle of repose)
        if (this.slideAngle) {
            const dir = Math.random() > 0.5 ? -1 : 1;

            // Check if there's support below diagonal position
            const hasSupport = !grid.isEmpty(x + dir, y + 2);
            const shouldSlide = !hasSupport || Math.random() > this.slideStability;

            if (shouldSlide && grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }

            // Try other direction
            if (shouldSlide && grid.canMoveTo(x, y, x - dir, y + 1)) {
                grid.swap(x, y, x - dir, y + 1);
                return true;
            }
        }

        return false;
    }
}

/**
 * LiquidFlowBehavior - For liquids with leveling and spreading
 * Implements multi-cell fall, diagonal flow, water leveling, and dispersion
 */
export class LiquidFlowBehavior {
    constructor(options = {}) {
        this.fallSpeed = options.fallSpeed || 4; // max cells to fall per update
        this.dispersionRate = options.dispersionRate || 2; // max cells to spread sideways
        this.viscosity = options.viscosity || 0; // 0=water, higher=thicker
        this.levelingEnabled = options.levelingEnabled !== false;
        this.avoidElements = options.avoidElements || []; // elements to avoid moving into
    }

    apply(x, y, grid) {
        const element = grid.getElement(x, y);

        // Priority 1: Multi-cell fall (faster falling)
        let fallDistance = 0;
        const maxFall = Math.max(1, this.fallSpeed - this.viscosity);

        while (fallDistance < maxFall) {
            const targetY = y + fallDistance + 1;

            // Check if we can move to target
            if (!grid.canMoveTo(x, y + fallDistance, x, targetY)) {
                break;
            }

            // Special case: avoid certain elements (e.g., water avoids lava)
            const targetElement = grid.getElement(x, targetY);
            if (targetElement && this.avoidElements.includes(targetElement.name)) {
                break;
            }

            fallDistance++;
        }

        if (fallDistance > 0) {
            grid.swap(x, y, x, y + fallDistance);
            return true;
        }

        // Priority 2: Diagonal fall
        const diagDir = Math.random() > 0.5 ? 1 : -1;

        if (grid.canMoveTo(x, y, x + diagDir, y + 1)) {
            const targetElement = grid.getElement(x + diagDir, y + 1);
            if (!targetElement || !this.avoidElements.includes(targetElement.name)) {
                grid.swap(x, y, x + diagDir, y + 1);
                return true;
            }
        }

        if (grid.canMoveTo(x, y, x - diagDir, y + 1)) {
            const targetElement = grid.getElement(x - diagDir, y + 1);
            if (!targetElement || !this.avoidElements.includes(targetElement.name)) {
                grid.swap(x, y, x - diagDir, y + 1);
                return true;
            }
        }

        // Priority 3: Water leveling (spread to equalize depth)
        // PERFORMANCE: Only check leveling every 3 frames + probability
        if (this.levelingEnabled && grid.frameCount % 3 === 0 && Math.random() > 0.3) {
            const result = this.waterLeveling(x, y, grid);
            if (result) return true;
        }

        // Priority 4: Sideways spread (dispersion)
        if (this.dispersionRate > 0) {
            const spreadDir = Math.random() > 0.5 ? 1 : -1;

            for (let i = 1; i <= this.dispersionRate; i++) {
                const targetX = x + (spreadDir * i);

                if (grid.canMoveTo(x, y, targetX, y)) {
                    const targetElement = grid.getElement(targetX, y);
                    if (!targetElement || !this.avoidElements.includes(targetElement.name)) {
                        grid.swap(x, y, targetX, y);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Water leveling - spreads liquid to equalize depth
     * Creates realistic pooling behavior
     */
    waterLeveling(x, y, grid) {
        const element = grid.getElement(x, y);

        // Measure water depth in both directions
        const leftDepth = this.measureLiquidDepth(x - 1, y, grid, element.state);
        const rightDepth = this.measureLiquidDepth(x + 1, y, grid, element.state);
        const currentDepth = this.measureLiquidDepth(x, y + 1, grid, element.state);

        // Move toward shallower side if depth difference > 1
        if (leftDepth < currentDepth - 1 && grid.canMoveTo(x, y, x - 1, y)) {
            grid.swap(x, y, x - 1, y);
            return true;
        }

        if (rightDepth < currentDepth - 1 && grid.canMoveTo(x, y, x + 1, y)) {
            grid.swap(x, y, x + 1, y);
            return true;
        }

        return false;
    }

    /**
     * Measures how deep the liquid is at a given position
     * PERFORMANCE: Limited to max depth of 5 to avoid deep scans
     */
    measureLiquidDepth(x, y, grid, liquidState) {
        const element = grid.getElement(x, y);

        // Not a liquid or different liquid type
        if (!element || element.state !== liquidState) {
            return 0;
        }

        let depth = 0;
        let checkY = y;
        const maxDepth = 5; // PERFORMANCE: Limit depth measurement

        // Count downward until we hit non-liquid (max 5 cells)
        while (checkY < grid.height && depth < maxDepth) {
            const checkElement = grid.getElement(x, checkY);
            if (!checkElement || checkElement.state !== liquidState) {
                break;
            }
            depth++;
            checkY++;
        }

        return depth;
    }
}

/**
 * GasBehavior - For gases and smoke
 * Implements rising with chaotic sideways movement
 */
export class GasBehavior {
    constructor(options = {}) {
        this.riseSpeed = options.riseSpeed !== undefined ? options.riseSpeed : 0.7; // probability to rise (0-1)
        this.spreadRate = options.spreadRate !== undefined ? options.spreadRate : 0.2; // sideways chaos (0-1)
        this.dissipation = options.dissipation || false; // gradually disappear
        this.dissipationRate = options.dissipationRate || 0.001; // probability to vanish
    }

    apply(x, y, grid) {
        // Dissipation (gradual disappearance)
        if (this.dissipation && Math.random() < this.dissipationRate) {
            grid.setElement(x, y, grid.registry.get('empty'));
            return true;
        }

        // Primary upward movement
        if (Math.random() < this.riseSpeed) {
            // Straight up
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }

            // Diagonal rise (flickering)
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y - 1)) {
                grid.swap(x, y, x + dir, y - 1);
                return true;
            }

            // Try opposite diagonal
            if (grid.isEmpty(x - dir, y - 1)) {
                grid.swap(x, y, x - dir, y - 1);
                return true;
            }
        }

        // Sideways spread (chaotic dancing)
        if (Math.random() < this.spreadRate) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
        }

        return false;
    }
}
