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

            // Drying speed based on exposure:
            // 4 dry sides: instant (completely exposed)
            // 3 dry sides: 60 frames (~1 second)
            // 2 dry sides: 300 frames (~5 seconds)
            // 1 dry side: 900 frames (~15 seconds)
            // 0 dry sides: don't dry (surrounded by wet_sand)

            if (drySides >= 4) {
                // Completely exposed - dry instantly
                grid.setElement(x, y, grid.registry.get('sand'));
                return true;
            } else if (drySides >= 3) {
                // Mostly exposed - dry very fast
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 60) {
                    grid.setElement(x, y, grid.registry.get('sand'));
                    return true;
                }
            } else if (drySides >= 2) {
                // Half exposed - dry moderately fast
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 300) {
                    grid.setElement(x, y, grid.registry.get('sand'));
                    return true;
                }
            } else if (drySides >= 1) {
                // Barely exposed - dry slowly
                cell.data.exposureTime++;
                if (cell.data.exposureTime > 900) {
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

        // PERMEABILITY - allow water to slowly seep through
        // Check if there's water above wanting to seep down
        if (isUnderWater) {
            const below = grid.getElement(x, y + 1);
            // If empty below, water can seep through (5% chance per frame)
            if (below && below.id === 0 && Math.random() > 0.95) {
                // Swap water down through the wet sand
                grid.swap(x, y - 1, x, y + 1);
                return true;
            }
        }

        // MOVEMENT - WET SAND PHYSICS
        const below = grid.getElement(x, y + 1);

        // PRIORITY 1: Always sink through water (wet sand is denser: 9 > 2)
        if (below && below.name === 'water') {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // PRIORITY 2: Fall through empty space
        if (below && below.id === 0) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // PRIORITY 3: When moist (touching water), stay static (no horizontal spreading)
        // This prevents "bubbling" effect
        if (hasMoisture) {
            return false;
        }

        // PRIORITY 4: When drying, allow slow settling
        if (grid.canMoveTo(x, y, x, y + 1)) {
            if (Math.random() > 0.9) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        // Slide when drying out
        if (Math.random() > 0.995) {
            const dir = Math.random() > 0.5 ? -1 : 1;
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
        }

        return false;
    }
}

export default WetSandElement;
