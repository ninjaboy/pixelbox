import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class SteamElement extends Element {
    constructor() {
        super(6, 'steam', 0xcccccc, {
            density: 0,
            state: STATE.GAS,
            dispersion: 2,
            lifetime: 240, // Steam dissipates after 4 seconds
            condensesInto: 'cloud',  // Condenses into clouds at atmosphere
            tags: [TAG.CONDENSES]
        });

        // Define atmosphere boundary (upper 25% of screen)
        this.atmosphereThreshold = 0.25;
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if steam has reached the atmosphere layer
        const atmosphereHeight = Math.floor(grid.height * this.atmosphereThreshold);

        if (y <= atmosphereHeight) {
            // Initialize condensation timer when first entering atmosphere
            if (cell.data.atmosphereTime === undefined) {
                cell.data.atmosphereTime = 0;
            }

            // Increment time spent in atmosphere
            cell.data.atmosphereTime++;

            // Only condense after spending time in atmosphere (3-6 seconds)
            const condensationDelay = 180 + Math.floor(Math.random() * 180); // 3-6 seconds at 60fps

            if (cell.data.atmosphereTime >= condensationDelay) {
                // Condense into cloud
                const cloudElement = grid.registry.get('cloud');
                if (cloudElement) {
                    grid.setElement(x, y, cloudElement);
                    return true;
                }
            }
        } else {
            // Reset timer if steam drops below atmosphere
            if (cell.data.atmosphereTime !== undefined) {
                cell.data.atmosphereTime = 0;
            }
        }

        // Steam rises rapidly (80% chance to prioritize upward movement)
        if (Math.random() > 0.2) {
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }

            // Diagonal rise
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

        // Expand sideways to fill space (20% horizontal expansion)
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

export default SteamElement;
