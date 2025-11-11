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
        // First check behaviors (melting)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // SLOW FALLING: Only move 30% of the time (snow drifts down gently)
        if (Math.random() > 0.3) {
            return false;
        }

        // Priority 1: Fall straight down
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
