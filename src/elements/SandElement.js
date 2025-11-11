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
        return this.movement.apply(x, y, grid);
    }
}

export default SandElement;
