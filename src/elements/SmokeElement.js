import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class SmokeElement extends Element {
    constructor() {
        super(8, 'smoke', 0x555555, {
            density: 0,
            state: STATE.GAS,
            dispersion: 3,
            lifetime: 180, // Lasts longer than steam
            tags: []
        });
    }

    update(x, y, grid) {
        // Smoke rises but drifts more than steam
        const driftChance = Math.random();

        if (driftChance > 0.3) {
            // Try to rise
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }
        }

        // Drift sideways more frequently
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.isEmpty(x + dir, y)) {
            grid.swap(x, y, x + dir, y);
            return true;
        }
        if (grid.isEmpty(x - dir, y)) {
            grid.swap(x, y, x - dir, y);
            return true;
        }

        // Try diagonal rise
        if (grid.isEmpty(x + dir, y - 1)) {
            grid.swap(x, y, x + dir, y - 1);
            return true;
        }
        if (grid.isEmpty(x - dir, y - 1)) {
            grid.swap(x, y, x - dir, y - 1);
            return true;
        }

        return false;
    }
}

export default SmokeElement;
