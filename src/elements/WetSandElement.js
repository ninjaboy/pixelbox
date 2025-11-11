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

        // DRYING LOGIC - Realistic evaporation from top of pile
        // Wet_sand exposed to air should dry, even if wet_sand below
        // But moisture wicks up from below, so slower drying

        const below = grid.getElement(x, y + 1);
        const left = grid.getElement(x - 1, y);
        const right = grid.getElement(x + 1, y);

        // Check for water contact (not wet_sand, actual water)
        const touchingWater =
            (above && above.name === 'water') ||
            (below && below.name === 'water') ||
            (left && left.name === 'water') ||
            (right && right.name === 'water');

        // Check if moisture wicking from below
        const hasWetSandBelow = below && below.name === 'wet_sand';

        // Drying conditions:
        // 1. Never dry if touching water directly
        // 2. Never dry if underwater
        // 3. Must be exposed to air to dry
        if (touchingWater || isUnderWater) {
            // Touching water - stay wet, reset timer
            cell.data.exposureTime = 0;
        } else if (isExposedToAir) {
            // Exposed to air - can dry
            cell.data.exposureTime++;

            // Drying speed depends on moisture wicking from below
            const dryingTime = hasWetSandBelow ? 1200 : 600; // Slower if wicking from below

            if (cell.data.exposureTime > dryingTime) {
                grid.setElement(x, y, grid.registry.get('sand'));
                return true;
            }
        } else {
            // Not exposed to air but not underwater either (something solid above)
            // Keep as wet_sand but don't advance drying timer
            cell.data.exposureTime = 0;
        }

        // For movement logic below
        const hasMoisture = touchingWater || hasWetSandBelow || isUnderWater;

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

        // MOVEMENT - WET SAND SHOULD BE COMPLETELY STATIC
        // FIX: Don't move at all if any moisture is present
        // This prevents "bubbling" effect from wet_sand trying to settle
        if (hasMoisture) {
            // Has moisture nearby - completely static, no movement
            return false;
        }

        // Only move if completely dry (drying out)
        // This handles the edge case of wet_sand that's drying
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
