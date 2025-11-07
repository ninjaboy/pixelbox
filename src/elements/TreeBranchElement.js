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
        // Tree branches maintain foliage ONLY if there are no leaves nearby
        // This prevents infinite growth
        if (Math.random() > 0.9995) { // 0.05% chance per frame (very rare)
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

            // Only spawn leaf if there are NO leaves in 2-pixel radius
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

export default TreeBranchElement;
