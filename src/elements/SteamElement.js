import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class SteamElement extends Element {
    constructor() {
        super(6, 'steam', 0xcccccc, {
            density: 0,
            state: STATE.GAS,
            dispersion: 2,
            lifetime: 120,
            condensesInto: 'water',  // Could condense back to water (future feature)
            tags: [TAG.CONDENSES]
        });
    }

    update(x, y, grid) {
        // Steam rises
        if (grid.isEmpty(x, y - 1)) {
            grid.swap(x, y, x, y - 1);
            return true;
        }

        // Drift sideways
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.isEmpty(x + dir, y)) {
            grid.swap(x, y, x + dir, y);
            return true;
        }
        if (grid.isEmpty(x + dir, y - 1)) {
            grid.swap(x, y, x + dir, y - 1);
            return true;
        }

        return false;
    }
}

export default SteamElement;
