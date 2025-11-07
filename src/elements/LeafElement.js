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

        // Check if leaf is still on the tree or has fallen
        const hasSupport = this.checkSupport(x, y, grid);

        // CRITICAL: Only age leaves that have FALLEN from the tree
        // Leaves on the tree stay green forever
        if (!hasSupport) {
            // Fallen leaf - start aging
            cell.data.age++;

            // Leaf lifecycle stages (for fallen leaves only):
            // 0-3600 frames (60s): Fresh green fallen leaf
            // 3600-7200 frames (60-120s): Aging, turning brown
            // 7200+ frames (120s+): Dead, turns to ash

            // Update color based on age (green -> yellow -> brown)
            if (cell.data.age > 3600) {
                // Aging phase: transition from green to brown
                const ageProgress = Math.min((cell.data.age - 3600) / 3600, 1.0); // 0 to 1

                // Color transition: 0x228b22 (green) -> 0x8b4513 (saddle brown)
                const startR = 0x22, startG = 0x8b, startB = 0x22;
                const endR = 0x8b, endG = 0x45, endB = 0x13;

                const r = Math.floor(startR + (endR - startR) * ageProgress);
                const g = Math.floor(startG + (endG - startG) * ageProgress);
                const b = Math.floor(startB + (endB - startB) * ageProgress);

                cell.element.color = (r << 16) | (g << 8) | b;
            }

            // After 120 seconds on ground, dead leaves decay into ash
            if (cell.data.age > 7200) {
                // 2% chance per frame to decay (slower)
                if (Math.random() > 0.98) {
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

            // Fall MUCH slower if no support (gentle floating down)
            if (Math.random() > 0.97) { // 3% chance to fall per frame (much slower)
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
        } else {
            // Leaf is still on tree - keep it green and reset age
            cell.data.age = 0;
            cell.element.color = 0x228b22; // Reset to fresh green
        }

        // Gentle sway (very occasional small movement) - only for tree leaves
        if (hasSupport && Math.random() > 0.999) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
        }

        // Regrow leaves ULTRA rare (0.01% chance per frame - 5x rarer than before)
        if (hasSupport && Math.random() > 0.9999) {
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
