import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class AshElement extends Element {
    constructor() {
        super(16, 'ash', 0x999999, { // Light gray
            density: 1,
            state: STATE.POWDER,
            dispersion: 1,
            tags: []
        });
    }

    update(x, y, grid) {
        // Ash falls like very light powder
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal fall
        const dir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        // Ash can be carried by water
        const waterElement = grid.getElement(x, y + 1);
        if (waterElement && waterElement.name === 'water') {
            // Sink slowly through water
            if (Math.random() > 0.7) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        return false;
    }
}

export default AshElement;
