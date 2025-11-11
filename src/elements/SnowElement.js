import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { HeatTransformationBehavior } from '../behaviors/TransformationBehaviors.js';

class SnowElement extends Element {
    constructor() {
        super(31, 'snow', 0xffffff, { // Pure white
            density: 1, // Very light, lighter than water
            state: STATE.POWDER,
            movable: true,
            tags: [TAG.FREEZING],
            brushSize: 3,
            emissionDensity: 0.6
        });

        // Melts when near heat sources
        this.addBehavior(new HeatTransformationBehavior({
            transformInto: 'water',
            transformChance: 0.15, // Melts faster than ice
            requiredTag: TAG.HEAT_SOURCE,
            checkDiagonals: true
        }));
    }

    update(x, y, grid) {
        // First check behaviors (melting from heat)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // CHECK FOR WATER CONTACT: Snow melts into slush when touching water
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // Snow touching water = melts into slush (wet snow)
                if (Math.random() < 0.6) { // 60% chance per contact - happens fairly quickly
                    grid.setElement(x, y, grid.registry.get('slush'));
                    return true;
                }
            }
        }

        // SLOW FALLING: Only move 30% of the time (snow drifts down gently)
        if (Math.random() > 0.3) {
            return false;
        }

        // Priority 1: Fall straight down
        const below = grid.getElement(x, y + 1);

        // Can't fall onto water - would create slush
        if (below && below.name === 'water') {
            // Snow on water surface converts to slush layer
            grid.setElement(x, y, grid.registry.get('slush'));
            return true;
        }

        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Priority 2: Diagonal slide (like sand, but slower)
        // Snow piles up and slides down at angles
        const dir = Math.random() > 0.5 ? -1 : 1;

        // Only slide 50% of the time
        if (Math.random() > 0.5 && grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }

        // Priority 3: Accumulate and settle (no movement)
        return false;
    }
}

export default SnowElement;
