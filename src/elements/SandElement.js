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
        // PERMEABILITY - allow water to percolate through dry sand (realistic porous behavior)
        // Water flows through gaps between sand grains before/while wetting occurs
        const above = grid.getElement(x, y - 1);
        const below = grid.getElement(x, y + 1);

        // If water is directly above and there's space below, let it percolate through
        if (above && above.name === 'water' && below && below.id === 0) {
            // 50% chance per frame - water flows through noticeably
            if (Math.random() < 0.50) {
                // Swap water down through the dry sand (percolation)
                grid.swap(x, y - 1, x, y + 1);
                return true;
            }
        }

        // Water-sand wetting interaction is handled by InteractionManager
        // This permeability runs FIRST, allowing water to flow through before heavy absorption
        return this.movement.apply(x, y, grid);
    }
}

export default SandElement;
