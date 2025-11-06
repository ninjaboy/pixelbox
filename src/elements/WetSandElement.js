import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class WetSandElement extends Element {
    constructor() {
        super(18, 'wet_sand', 0x8b7355, { // Darker brown color
            density: 4, // Heavier than regular sand (3) and water (2)
            state: STATE.POWDER,
            dispersion: 0,
            tags: [],
            lifetime: 600, // Dries out after 10 seconds (600 frames)
            brushSize: 5,
            emissionDensity: 1.0
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if still touching water - if so, reset lifetime (stays wet)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement && neighborElement.name === 'water') {
                cell.lifetime = 600; // Reset drying timer
                break;
            }
        }

        // When lifetime expires, dry out back to regular sand
        if (cell.lifetime === 1) {
            grid.setElement(x, y, grid.registry.get('sand'));
            return true;
        }

        // Wet sand barely moves - very stable
        // Only fall straight down if there's nothing beneath
        if (grid.canMoveTo(x, y, x, y + 1)) {
            // Only 30% chance to fall (very cohesive)
            if (Math.random() > 0.7) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        // Almost never slides diagonally (only if very unstable)
        if (Math.random() > 0.95) {
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
