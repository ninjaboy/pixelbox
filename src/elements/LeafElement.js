import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class LeafElement extends Element {
    constructor() {
        super(13, 'leaf', 0x228b22, { // Forest green
            density: 0.5,
            state: STATE.SOLID,
            movable: true, // Can be displaced
            ignitionResistance: 0.5, // Moderately flammable
            burnsInto: 'fire',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    update(x, y, grid) {
        // Leaves sway gently and can fall if not supported
        const hasSupport = this.checkSupport(x, y, grid);

        if (!hasSupport) {
            // Fall slowly if no support (gentle floating down)
            if (Math.random() > 0.92) { // 8% chance to fall per frame (slow)
                if (grid.isEmpty(x, y + 1)) {
                    grid.swap(x, y, x, y + 1);
                    return true;
                }

                // Drift sideways while falling (gentle sway)
                const dir = Math.random() > 0.5 ? 1 : -1;
                if (grid.isEmpty(x + dir, y + 1)) {
                    grid.swap(x, y, x + dir, y + 1);
                    return true;
                }
            }
        }

        // Gentle sway (very occasional small movement)
        if (Math.random() > 0.999) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
        }

        // Regrow leaves MUCH rarer (0.05% chance per frame)
        if (hasSupport && Math.random() > 0.9995) {
            const leafElement = grid.registry.get('leaf');
            if (!leafElement) return false;

            // Try to spawn a new leaf in an adjacent empty space
            const positions = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            // Shuffle positions for randomness
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }

            for (const [nx, ny] of positions) {
                if (grid.isEmpty(nx, ny)) {
                    grid.setElement(nx, ny, leafElement);
                    return true;
                }
            }
        }

        return false;
    }

    checkSupport(x, y, grid) {
        // Check if connected to wood or other leaves
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement) {
                const name = neighborElement.name;
                if (name === 'tree_trunk' || name === 'tree_branch' ||
                    name === 'wood' || name === 'burning_wood') {
                    return true;
                }
            }
        }

        // Check for nearby leaves (clusters stay together)
        let leafCount = 0;
        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement && neighborElement.name === 'leaf') {
                leafCount++;
            }
        }

        return leafCount >= 2; // Supported if at least 2 leaf neighbors
    }
}

export default LeafElement;
