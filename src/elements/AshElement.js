import Element from '../Element.js';
import { STATE, ELEMENT_TYPE, TAG } from '../ElementProperties.js';
import { GravityBehavior } from '../behaviors/MovementBehaviors.js';

class AshElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.ASH, 'ash', 0x999999, { // Light gray
            density: 1,
            state: STATE.POWDER,
            dispersion: 1,
            tags: new Set([TAG.DISSOLVES]),
            lifetime: 600 // Dissolve after 10 seconds (600 frames at 60fps)
        });

        // Use standardized gravity behavior (lighter, more stable than sand)
        this.movement = new GravityBehavior({
            fallSpeed: 1,
            slideAngle: true,
            slideStability: 0.90 // More stable than sand (0.85)
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Dissolve faster when in water
        const waterElement = grid.getElement(x, y + 1);
        if (waterElement && waterElement.name === 'water') {
            // Accelerate lifetime decay in water (3x faster)
            if (cell.lifetime > 0) {
                cell.lifetime -= 2; // -1 happens automatically, -2 extra = 3x total
            }

            // Sink slowly through water
            if (Math.random() > 0.7) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
            return false;
        }

        // Delegate to gravity behavior
        return this.movement.apply(x, y, grid);
    }
}

export default AshElement;
