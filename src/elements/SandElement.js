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
        // FIX v3: Check if sand is underwater by looking UP the column
        // Problem: Sand in a pile only has sand neighbors, not water
        // Solution: Check if there's water ANYWHERE above this sand particle

        // First check immediate neighbors (fast path for sand at surface)
        const immediateNeighbors = [
            grid.getElement(x, y - 1), // above
            grid.getElement(x, y + 1), // below
            grid.getElement(x - 1, y), // left
            grid.getElement(x + 1, y), // right
        ];

        for (const neighbor of immediateNeighbors) {
            if (neighbor && neighbor.name === 'water') {
                grid.setElement(x, y, grid.registry.get('wet_sand'));
                return true;
            }
        }

        // Check if there's water anywhere in the column above (slower, but necessary)
        // This catches sand at the bottom of piles underwater
        for (let checkY = y - 1; checkY >= 0; checkY--) {
            const elementAbove = grid.getElement(x, checkY);
            if (!elementAbove || elementAbove.id === 0) {
                // Hit empty space - not underwater
                break;
            }
            if (elementAbove.name === 'water') {
                // Found water above - we're underwater
                grid.setElement(x, y, grid.registry.get('wet_sand'));
                return true;
            }
            // If we hit something solid that's not sand/wet_sand, stop checking
            if (elementAbove.name !== 'sand' && elementAbove.name !== 'wet_sand') {
                break;
            }
        }

        return this.movement.apply(x, y, grid);
    }
}

export default SandElement;
