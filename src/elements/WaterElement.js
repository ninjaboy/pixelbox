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
        // PRIORITY 0: Surface evaporation (water exposed to air evaporates faster)
        const above = grid.getElement(x, y - 1);
        if (above && above.id === 0) {
            // Water at the surface has a higher chance to evaporate
            // Check if this is at the top edge of a water body
            const isAtSurface = this.isAtSurface(x, y, grid);

            if (isAtSurface) {
                // 0.01% chance per frame for surface water to evaporate naturally (very slow)
                if (Math.random() < 0.0001) {
                    const steamElement = grid.registry.get('steam');
                    if (steamElement) {
                        grid.setElement(x, y, steamElement);
                        return true;
                    }
                }
            }
        }

        // PRIORITY 1: Try to seep through wet sand below (permeability)
        const below = grid.getElement(x, y + 1);
        if (below && below.name === 'wet_sand') {
            // Check if there's empty space below the wet sand
            const belowWetSand = grid.getElement(x, y + 2);
            if (belowWetSand && belowWetSand.id === 0 && Math.random() > 0.93) {
                // Seep through: swap with the space below wet sand
                grid.swap(x, y, x, y + 2);
                return true;
            }
        }

        // PRIORITY 2: Try to fall multiple cells in one frame (fast falling liquid)
        let fallDistance = 0;
        const maxFallDistance = 4;

        // Keep falling while possible
        while (fallDistance < maxFallDistance && grid.canMoveTo(x, y + fallDistance, x, y + fallDistance + 1)) {
            fallDistance++;
        }

        if (fallDistance > 0) {
            grid.swap(x, y, x, y + fallDistance);
            return true;
        }

        // PRIORITY 3: Try diagonal fall
        const fallDir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + fallDir, y + 1)) {
            grid.swap(x, y, x + fallDir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - fallDir, y + 1)) {
            grid.swap(x, y, x - fallDir, y + 1);
            return true;
        }

        // PRIORITY 4: WATER LEVELING - try to equalize with neighboring water
        // Check if there's lower water level on either side
        const leftElement = grid.getElement(x - 1, y);
        const rightElement = grid.getElement(x + 1, y);

        // Count water depth below this position
        let depthHere = this.getWaterDepthBelow(x, y, grid);
        let depthLeft = leftElement && leftElement.id === 0 ? 0 : this.getWaterDepthBelow(x - 1, y, grid);
        let depthRight = rightElement && rightElement.id === 0 ? 0 : this.getWaterDepthBelow(x + 1, y, grid);

        // Flow toward side with less water depth (leveling behavior)
        if (depthLeft < depthHere - 1 && grid.canMoveTo(x, y, x - 1, y)) {
            grid.swap(x, y, x - 1, y);
            return true;
        }
        if (depthRight < depthHere - 1 && grid.canMoveTo(x, y, x + 1, y)) {
            grid.swap(x, y, x + 1, y);
            return true;
        }

        // PRIORITY 5: Flow sideways aggressively (water spreads fast)
        if (Math.random() > 0.05) {
            const flowDir = Math.random() > 0.5 ? 1 : -1;
            if (grid.canMoveTo(x, y, x + flowDir, y)) {
                grid.swap(x, y, x + flowDir, y);
                return true;
            }
            if (grid.canMoveTo(x, y, x - flowDir, y)) {
                grid.swap(x, y, x - flowDir, y);
                return true;
            }
        }

        return false;
    }

    // Check if water is at the surface (top edge of water body)
    isAtSurface(x, y, grid) {
        // Water is at surface if there's air above it
        const above = grid.getElement(x, y - 1);
        if (!above || above.id !== 0) {
            return false; // Not at surface if something is above
        }

        // Also check if there's water or solid below (not floating in air)
        const below = grid.getElement(x, y + 1);
        if (!below || below.id === 0) {
            // Check diagonal support
            const belowLeft = grid.getElement(x - 1, y + 1);
            const belowRight = grid.getElement(x + 1, y + 1);

            // At surface if it has support below or to the sides
            return (below && below.id !== 0) ||
                   (belowLeft && belowLeft.name === 'water') ||
                   (belowRight && belowRight.name === 'water');
        }

        return true;
    }

    // Helper method to check water depth below a position
    getWaterDepthBelow(x, y, grid) {
        let depth = 0;
        let checkY = y + 1;

        // Count consecutive water below (up to 10 cells)
        while (checkY < grid.height && depth < 10) {
            const element = grid.getElement(x, checkY);
            if (element && element.name === 'water') {
                depth++;
                checkY++;
            } else {
                break;
            }
        }

        return depth;
    }
}

export default WaterElement;
