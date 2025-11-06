import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class WaterElement extends Element {
    constructor() {
        super(2, 'water', 0x4a90e2, {
            density: 2,
            state: STATE.LIQUID,
            dispersion: 3,
            evaporatesInto: 'steam',  // Transforms to steam when heated
            tags: [TAG.EVAPORATES],
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });
    }

    update(x, y, grid) {
        // Try to fall multiple cells in one frame (faster falling)
        let fallDistance = 0;
        const maxFallDistance = 3; // Fall up to 3 cells per frame

        // Keep falling while possible
        while (fallDistance < maxFallDistance && grid.canMoveTo(x, y + fallDistance, x, y + fallDistance + 1)) {
            fallDistance++;
        }

        if (fallDistance > 0) {
            grid.swap(x, y, x, y + fallDistance);
            return true;
        }

        // Try diagonal fall
        const fallDir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + fallDir, y + 1)) {
            grid.swap(x, y, x + fallDir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - fallDir, y + 1)) {
            grid.swap(x, y, x - fallDir, y + 1);
            return true;
        }

        // Flow sideways (water spreads more than sand)
        const flowDir = Math.random() > 0.5 ? 1 : -1;
        if (grid.canMoveTo(x, y, x + flowDir, y)) {
            grid.swap(x, y, x + flowDir, y);
            return true;
        }
        if (grid.canMoveTo(x, y, x - flowDir, y)) {
            grid.swap(x, y, x - flowDir, y);
            return true;
        }

        return false;
    }
}

export default WaterElement;
