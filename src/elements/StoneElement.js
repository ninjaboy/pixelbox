import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x666666, {
            density: 6, // Reduced from 10 for more realistic physics
            state: STATE.SOLID,
            movable: true, // Stone can now fall
            tags: [],
            brushSize: 3, // Medium brush for building
            emissionDensity: 1.0 // Solid placement
        });
    }

    update(x, y, grid) {
        // Stones fall straight down (boulders stay together vertically)
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Stones RARELY slide diagonally (much less than sand)
        // This prevents horizontal spreading - boulders stay compact
        const dir = Math.random() > 0.5 ? -1 : 1;

        // Only slide 2% of the time (vs sand's 15%)
        if (Math.random() > 0.98) {
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
            if (grid.canMoveTo(x, y, x - dir, y + 1)) {
                grid.swap(x, y, x - dir, y + 1);
                return true;
            }
        }

        return false;
    }
}

export default StoneElement;
