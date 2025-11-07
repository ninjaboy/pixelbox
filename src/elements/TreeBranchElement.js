import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeBranchElement extends Element {
    constructor() {
        super(12, 'tree_branch', 0x8b5a3c, {
            density: 5,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.70, // Moderately flammable (living wood slightly harder than dead wood)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    update(x, y, grid) {
        // Tree branches actively maintain foliage
        // Very rare chance to spawn a new leaf adjacent to branch
        if (Math.random() > 0.998) { // 0.2% chance per frame
            const leafElement = grid.registry.get('leaf');
            if (!leafElement) return false;

            // Check adjacent spaces for empty spots
            const positions = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            // Shuffle for randomness
            positions.sort(() => Math.random() - 0.5);

            for (const [nx, ny] of positions) {
                if (grid.isEmpty(nx, ny)) {
                    grid.setElement(nx, ny, leafElement);
                    return true;
                }
            }
        }

        return false;
    }
}

export default TreeBranchElement;
