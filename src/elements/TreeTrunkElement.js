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

    updateImpl(x, y, grid) {
        // Tree trunks maintain minimal foliage ONLY when bare
        if (Math.random() > 0.99998) { // 0.002% chance per frame (almost never)
            const leafElement = grid.registry.get('leaf');
            if (!leafElement) return false;

            // Check if there are already leaves nearby
            let hasNearbyLeaves = false;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const neighbor = grid.getElement(x + dx, y + dy);
                    if (neighbor && neighbor.name === 'leaf') {
                        hasNearbyLeaves = true;
                        break;
                    }
                }
                if (hasNearbyLeaves) break;
            }

            // Only spawn leaf if trunk is completely bare
            if (!hasNearbyLeaves) {
                const positions = [
                    [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
                ];

                positions.sort(() => Math.random() - 0.5);

                for (const [nx, ny] of positions) {
                    if (grid.isEmpty(nx, ny)) {
                        grid.setElement(nx, ny, leafElement);
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

export default TreeTrunkElement;
