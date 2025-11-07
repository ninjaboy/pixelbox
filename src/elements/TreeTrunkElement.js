import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeTrunkElement extends Element {
    constructor() {
        super(11, 'tree_trunk', 0x6b4423, {
            density: 6,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.75, // Trunk is hardest to burn but still flammable (living wood core)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    update(x, y, grid) {
        // Tree trunks occasionally spawn leaves (rarer than branches)
        if (Math.random() > 0.9995) { // 0.05% chance per frame (rarer than branches)
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

export default TreeTrunkElement;
