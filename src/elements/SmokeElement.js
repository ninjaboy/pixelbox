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
        // Smoke rises slower than steam and spreads more (50/50 rise vs spread)
        const shouldRise = Math.random() > 0.5;

        if (shouldRise) {
            // Try to rise
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }

            // Try diagonal rise
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y - 1)) {
                grid.swap(x, y, x + dir, y - 1);
                return true;
            }
            if (grid.isEmpty(x - dir, y - 1)) {
                grid.swap(x, y, x - dir, y - 1);
                return true;
            }
        }

        // Spread sideways aggressively (billowing effect)
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.isEmpty(x + dir, y)) {
            grid.swap(x, y, x + dir, y);
            return true;
        }
        if (grid.isEmpty(x - dir, y)) {
            grid.swap(x, y, x - dir, y);
            return true;
        }

        return false;
    }
}

export default SmokeElement;
