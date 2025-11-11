import Element from '../Element.js';
import { STATE, ELEMENT_TYPE, TAG } from '../ElementProperties.js';
import { GravityBehavior } from '../behaviors/MovementBehaviors.js';

class SandElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.SAND, 'sand', 0xdaa520, { // Goldenrod - warmer, more saturated
            density: 3,
            state: STATE.POWDER,
            dispersion: 1,
            tags: new Set([TAG.MINERAL]),
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });

        // Use standardized gravity behavior
        this.movement = new GravityBehavior({
            fallSpeed: 1,
            slideAngle: true,
            slideStability: 0.85 // Creates realistic ~45° pile formation
        });
    }

    updateImpl(x, y, grid) {
        // FIX v2: Check if sand is touching water in any direction
        // The previous fix only checked above, but sand displaces water when sinking
        // So we need to check all neighbors to catch sand moving through water
        const neighbors = [
            grid.getElement(x, y - 1), // above
            grid.getElement(x, y + 1), // below
            grid.getElement(x - 1, y), // left
            grid.getElement(x + 1, y), // right
        ];

        for (const neighbor of neighbors) {
            if (neighbor && neighbor.name === 'water') {
                // Sand is touching water - convert to wet_sand immediately
                grid.setElement(x, y, grid.registry.get('wet_sand'));
                return true;
            }
        }

        return this.movement.apply(x, y, grid);
    }
}

export default SandElement;
