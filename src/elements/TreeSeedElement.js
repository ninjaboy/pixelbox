import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeSeedElement extends Element {
    constructor() {
        super(10, 'tree_seed', 0x654321, {
            density: 3,
            state: STATE.SOLID,
            movable: false,
            tags: [TAG.ORGANIC],
            brushSize: 0, // Single pixel placement
            emissionDensity: 1.0 // Plant 1 seed precisely
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize growth counter
        if (!cell.data.growthTimer) {
            cell.data.growthTimer = 0;
        }

        // Slow growth - wait 60 frames before starting
        cell.data.growthTimer++;
        if (cell.data.growthTimer < 60) return false;

        // Check if we can grow upward
        if (grid.isEmpty(x, y - 1)) {
            // Convert to trunk and place trunk above
            const trunkElement = grid.registry.get('tree_trunk');
            if (trunkElement) {
                // Place trunk above
                grid.setElement(x, y - 1, trunkElement);
                const aboveCell = grid.getCell(x, y - 1);
                if (aboveCell) {
                    aboveCell.data.growthStage = 0;
                    aboveCell.data.canGrow = true;
                }

                // Convert self to trunk
                grid.setElement(x, y, trunkElement);
                const thisCell = grid.getCell(x, y);
                if (thisCell) {
                    thisCell.data.growthStage = 1;
                    thisCell.data.canGrow = false; // Base doesn't grow anymore
                }

                return true;
            }
        }

        return false;
    }
}

export default TreeSeedElement;
