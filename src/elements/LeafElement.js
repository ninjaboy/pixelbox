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

    // Initialize leaf with age tracking
    initializeCell(data) {
        data.age = 0;
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Age the leaf over time
        cell.data.age++;

        // Leaf lifecycle stages:
        // 0-1800 frames (30s): Fresh green leaf
        // 1800-3600 frames (30-60s): Aging, turning brown
        // 3600+ frames (60s+): Dead, turns to ash/empty

        // Update color based on age (green -> yellow -> brown)
        if (cell.data.age > 1800) {
            // Aging phase: transition from green to brown
            const ageProgress = Math.min((cell.data.age - 1800) / 1800, 1.0); // 0 to 1

            // Color transition: 0x228b22 (green) -> 0x8b4513 (saddle brown)
            const startR = 0x22, startG = 0x8b, startB = 0x22;
            const endR = 0x8b, endG = 0x45, endB = 0x13;

            const r = Math.floor(startR + (endR - startR) * ageProgress);
            const g = Math.floor(startG + (endG - startG) * ageProgress);
            const b = Math.floor(startB + (endB - startB) * ageProgress);

            cell.element.color = (r << 16) | (g << 8) | b;
        }

        // After 60 seconds, dead leaves decay into ash
        if (cell.data.age > 3600) {
            // 5% chance per frame to decay
            if (Math.random() > 0.95) {
                const ashElement = grid.registry.get('ash');
                if (ashElement) {
                    grid.setElement(x, y, ashElement);
                } else {
                    // Fallback: turn to empty if no ash
                    grid.setElement(x, y, grid.registry.get('empty'));
                }
                return true;
            }
        }

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
