import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class AshElement extends Element {
    constructor() {
        super(16, 'ash', 0x999999, { // Light gray
            density: 1,
            state: STATE.POWDER,
            dispersion: 1,
            tags: [],
            lifetime: 600 // Dissolve after 10 seconds (600 frames at 60fps)
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

        return false;
    }
}

export default AshElement;
