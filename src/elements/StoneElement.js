import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x666666, {
            density: 10,
            state: STATE.SOLID,
            movable: true, // Stone can now fall
            tags: [],
            brushSize: 3, // Medium brush for building
            emissionDensity: 1.0 // Solid placement
        });
    }

    update(x, y, grid) {
        // Stone falls like heavy powder
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal fall with randomness (like sand)
        const dir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        return false;
    }
}

export default StoneElement;
