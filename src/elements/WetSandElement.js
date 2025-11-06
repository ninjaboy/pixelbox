import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class WetSandElement extends Element {
    constructor() {
        super(18, 'wet_sand', 0x8b7355, { // Darker brown color
            density: 4, // Heavier than regular sand (3) and water (2)
            state: STATE.POWDER,
            dispersion: 0,
            tags: [],
            lifetime: -1, // No automatic decay - controlled by exposure logic
            brushSize: 5,
            emissionDensity: 1.0
        });
    }

    update(x, y, grid) {
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

        // Check if touching water on any side (for saturation)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        let touchingWater = false;
        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement && neighborElement.name === 'water') {
                touchingWater = true;
                break;
            }
        }

        // DRYING LOGIC - only dry when exposed to air (not underwater)
        if (isExposedToAir && !touchingWater) {
            // Exposed to air and not touching water - start drying
            cell.data.exposureTime++;

            // Dry out after 600 frames (10 seconds) of air exposure
            if (cell.data.exposureTime > 600) {
                grid.setElement(x, y, grid.registry.get('sand'));
                return true;
            }
        } else {
            // Underwater or touching water - stay wet, reset exposure
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

        // MOVEMENT - wet sand is VERY static, barely moves
        // Only fall straight down if there's nothing beneath (10% chance)
        if (grid.canMoveTo(x, y, x, y + 1)) {
            if (Math.random() > 0.9) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        // Almost NEVER slides diagonally (0.5% chance - super stable)
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
