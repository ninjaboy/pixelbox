import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class SmokeElement extends Element {
    constructor() {
        super(8, 'smoke', 0x555555, {
            density: 0,
            state: STATE.GAS,
            dispersion: 3,
            lifetime: 180, // Base lifetime (3 seconds)
            tags: []
        });

        // Define atmosphere boundary (upper 40% of screen - same as clouds/steam)
        this.atmosphereThreshold = 0.40;
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if we're in the atmosphere layer
        const atmosphereHeight = Math.floor(grid.height * this.atmosphereThreshold);
        const inAtmosphere = y < atmosphereHeight;

        // EXTENDED LIFETIME IN ATMOSPHERE: Smoke lingers much longer at high altitude
        if (inAtmosphere) {
            // Initialize atmosphere timer
            if (cell.data.atmosphereTime === undefined) {
                cell.data.atmosphereTime = 0;
                // Extend lifetime to 30-60 seconds when reaching atmosphere
                cell.lifetime = 1800 + Math.floor(Math.random() * 1800); // 30-60 seconds
            }
            cell.data.atmosphereTime++;
        } else {
            // Reset atmosphere data if smoke drops below atmosphere
            if (cell.data.atmosphereTime !== undefined) {
                delete cell.data.atmosphereTime;
            }
        }

        // Smoke rises slower than steam and spreads more
        if (inAtmosphere) {
            // In atmosphere: mostly drift sideways, very slow rise
            const shouldRise = Math.random() > 0.85; // 15% chance to rise (much slower)

            if (shouldRise) {
                // Very slow rise in atmosphere
                if (grid.isEmpty(x, y - 1)) {
                    grid.swap(x, y, x, y - 1);
                    return true;
                }
            }

            // Spread sideways aggressively at high altitude (dense smoke layer)
            if (Math.random() > 0.3) { // 70% chance to spread
                const dir = Math.random() > 0.5 ? 1 : -1;
                if (grid.isEmpty(x + dir, y)) {
                    grid.swap(x, y, x + dir, y);
                    return true;
                }
                if (grid.isEmpty(x - dir, y)) {
                    grid.swap(x, y, x - dir, y);
                    return true;
                }
            }
        } else {
            // Below atmosphere: rise faster
            const shouldRise = Math.random() > 0.4; // 60% chance to rise

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

            // Spread sideways (billowing effect)
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
            if (grid.isEmpty(x - dir, y)) {
                grid.swap(x, y, x - dir, y);
                return true;
            }
        }

        return false;
    }
}

export default SmokeElement;
