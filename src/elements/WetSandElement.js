import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class WetSandElement extends Element {
    constructor() {
        super(18, 'wet_sand', 0x8b7355, { // Darker brown color
            density: 9, // Much heavier than lava (8) - wet sand blocks lava flow
            state: STATE.POWDER,
            dispersion: 0,
            tags: [],
            lifetime: -1, // No automatic decay - controlled by exposure logic
            brushSize: 5,
            emissionDensity: 1.0
        });

        // REMOVED: WetDryTransitionBehavior - it was interfering with manual moisture logic
        // Now we handle all wet/dry transitions manually in updateImpl for full control
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize exposure tracking
        if (cell.data.exposureTime === undefined) {
            cell.data.exposureTime = 0;
        }

        // Check what's above this wet sand
        const above = grid.getElement(x, y - 1);
        const isExposedToAir = !above || above.id === 0;
        const isUnderWater = above && above.name === 'water';

        // DRYING LOGIC - Simple exposure-based drying
        // Count how many sides are "dry" (air/empty or dry sand)
        // More dry sides = faster drying

        const below = grid.getElement(x, y + 1);
        const left = grid.getElement(x - 1, y);
        const right = grid.getElement(x + 1, y);

        // Check for water contact (actual water, not wet_sand)
        const touchingWater =
            (above && above.name === 'water') ||
            (below && below.name === 'water') ||
            (left && left.name === 'water') ||
            (right && right.name === 'water');

        let hasMoisture = false;

        // Never dry if touching water or underwater
        if (touchingWater || isUnderWater) {
            cell.data.exposureTime = 0;
            hasMoisture = true;
        } else {
            // Count dry neighbors (air/empty or dry sand)
            const neighbors = [above, below, left, right];
            let drySides = 0;

            for (const neighbor of neighbors) {
                if (!neighbor || neighbor.id === 0 || neighbor.name === 'sand') {
                    drySides++;
                }
            }

            // Drying speed based on exposure (MUCH SLOWER to prevent premature drying):
            // 4 dry sides: 240 frames (~4 seconds) - 2x slower
            // 3 dry sides: 360 frames (~6 seconds) - 2x slower
            // 2 dry sides: 900 frames (~15 seconds) - ~2x slower
            // 1 dry side: 2400 frames (~40 seconds) - 2x slower
            // 0 dry sides: don't dry (surrounded by wet_sand)

            if (drySides >= 4) {
                // Completely exposed - dry fast but not instant
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 240) {
                    grid.setElement(x, y, grid.registry.get('sand'));
                    return true;
                }
            } else if (drySides >= 3) {
                // Mostly exposed - dry moderately
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 360) {
                    grid.setElement(x, y, grid.registry.get('sand'));
                    return true;
                }
            } else if (drySides >= 2) {
                // Half exposed - dry slowly
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 900) {
                    grid.setElement(x, y, grid.registry.get('sand'));
                    return true;
                }
            } else if (drySides >= 1) {
                // Barely exposed - dry very slowly
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 2400) {
                    grid.setElement(x, y, grid.registry.get('sand'));
                    return true;
                }
            } else {
                // No dry sides (surrounded by wet_sand) - stay wet
                cell.data.exposureTime = 0;
            }

            // For movement logic below
            hasMoisture = drySides < 3;
        }

        // PERMEABILITY - allow water to seep through (wet sand is MORE permeable than dry)
        // Check if there's water above wanting to seep down
        if (isUnderWater) {
            // If empty below, water can seep through (70% chance - saturated sand flows easily)
            if (below && below.id === 0 && Math.random() < 0.70) {
                // Swap water down through the wet sand
                grid.swap(x, y - 1, x, y + 1);
                return true;
            }
        }

        // MOVEMENT - WET SAND PHYSICS (same spreading as dry sand, but sinks through water)
        // Reuse 'below' variable already declared above

        // PRIORITY 1: Always sink through water (wet sand is denser: 9 > 2)
        if (below && below.name === 'water') {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // PRIORITY 2: Fall straight down through empty space
        if (below && below.id === 0) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // PRIORITY 3: Diagonal sliding (angle of repose) - just like dry sand
        // This allows wet sand to spread and form piles
        const dir = Math.random() > 0.5 ? -1 : 1;
        const diagBelow = grid.getElement(x + dir, y + 1);

        // Slide diagonally if space is available
        if (diagBelow && (diagBelow.id === 0 || diagBelow.name === 'water')) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }

        // Try opposite direction
        const oppDiagBelow = grid.getElement(x - dir, y + 1);
        if (oppDiagBelow && (oppDiagBelow.id === 0 || oppDiagBelow.name === 'water')) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        return false;
    }
}

export default WetSandElement;
