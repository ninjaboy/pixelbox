import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x666666, {
            density: 6, // Reduced from 10 for more realistic physics
            state: STATE.SOLID,
            movable: true, // Stone can now fall
            tags: [],
            brushSize: 3, // Medium brush for building
            emissionDensity: 1.0 // Solid placement
        });
    }

    update(x, y, grid) {
        // Check if this stone has neighboring stones (forms a boulder/cluster)
        const isStable = this.hasStoneNeighbor(x, y, grid);

        // Only isolated stones fall - connected stones stick together as boulders
        if (!isStable) {
            // Try to fall straight down
            if (grid.canMoveTo(x, y, x, y + 1)) {
                grid.swap(x, y, x, y + 1);
                return true;
            }

            // Try diagonal fall with randomness (like sand)
            const dir = Math.random() > 0.5 ? -1 : 1;
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
            if (grid.canMoveTo(x, y, x - dir, y + 1)) {
                grid.swap(x, y, x - dir, y + 1);
                return true;
            }
        }

        // Stable stones (part of a boulder) don't move
        return false;
    }

    hasStoneNeighbor(x, y, grid) {
        // Check 4 cardinal directions for neighboring stones
        const cardinalNeighbors = [
            [x, y - 1],  // up
            [x, y + 1],  // down
            [x - 1, y],  // left
            [x + 1, y]   // right
        ];

        for (const [nx, ny] of cardinalNeighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement && neighborElement.name === 'stone') {
                return true;
            }
        }

        return false;
    }
}

export default StoneElement;
