import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class SandElement extends Element {
    constructor() {
        super(1, 'sand', 0xc2b280, {
            density: 3,
            state: STATE.POWDER,
            dispersion: 1,
            tags: [],
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });
    }

    update(x, y, grid) {
        // Try to fall down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal fall with slight randomness
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

export default SandElement;
