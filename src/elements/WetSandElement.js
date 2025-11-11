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

        // DRYING LOGIC - VERY conservative
        // Wet_sand should NEVER dry unless truly isolated and exposed to air
        // Check all neighbors for any moisture source
        const allNeighbors = [
            grid.getElement(x, y - 1), // above
            grid.getElement(x, y + 1), // below
            grid.getElement(x - 1, y), // left
            grid.getElement(x + 1, y), // right
        ];

        const hasMoisture = allNeighbors.some(n =>
            n && (n.name === 'water' || n.name === 'wet_sand')
        );

        // Only allow drying if:
        // 1. Exposed to air (empty above)
        // 2. No water or wet_sand touching at all
        // 3. Not underwater
        if (isExposedToAir && !hasMoisture && !isUnderWater) {
            cell.data.exposureTime++;

            // Dry out after 600 frames (10 seconds) of complete isolation
            if (cell.data.exposureTime > 600) {
                grid.setElement(x, y, grid.registry.get('sand'));
                return true;
            }
        } else {
            // ANY moisture nearby - stay wet, reset timer
            cell.data.exposureTime = 0;
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
