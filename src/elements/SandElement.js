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
        // FIX v4: Moisture propagation - sand gets wet from water OR wet_sand
        // More realistic: moisture spreads from wet particles to dry ones
        // Sand only stays dry when touching air/dry surfaces

        const neighbors = [
            grid.getElement(x, y - 1), // above
            grid.getElement(x, y + 1), // below
            grid.getElement(x - 1, y), // left
            grid.getElement(x + 1, y), // right
        ];

        for (const neighbor of neighbors) {
            if (neighbor && (neighbor.name === 'water' || neighbor.name === 'wet_sand')) {
                // Moisture propagates: water OR wet_sand makes sand wet
                grid.setElement(x, y, grid.registry.get('wet_sand'));
                return true;
            }
        }

        return this.movement.apply(x, y, grid);
    }
}

export default SandElement;
