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
            // 0-300 frames (5s): Fresh green fallen leaf
            // 300-900 frames (5-15s): Aging, turning brown
            // 900+ frames (15s+): Dead, turns to ash

            // Update color based on age (green -> yellow -> brown)
            if (cell.data.age > 300) {
                // Aging phase: transition from green to brown
                const ageProgress = Math.min((cell.data.age - 300) / 600, 1.0); // 0 to 1

                // Color transition: 0x228b22 (green) -> 0x8b4513 (saddle brown)
                const startR = 0x22, startG = 0x8b, startB = 0x22;
                const endR = 0x8b, endG = 0x45, endB = 0x13;

                const r = Math.floor(startR + (endR - startR) * ageProgress);
                const g = Math.floor(startG + (endG - startG) * ageProgress);
                const b = Math.floor(startB + (endB - startB) * ageProgress);

                cell.element.color = (r << 16) | (g << 8) | b;
            }

            // After 15 seconds on ground, dead leaves decay into ash
            if (cell.data.age > 900) {
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

        // CONTROLLED REGROWTH: Only regrow if there are missing leaves nearby
        // This prevents infinite blob growth
        if (hasSupport && Math.random() > 0.998) { // 0.2% chance per frame (slower)
            const leafElement = grid.registry.get('leaf');
            if (!leafElement) return false;

            // Check if there are gaps in foliage (missing leaves that should be filled)
            const positions = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            // Count how many leaves are around this leaf
            let adjacentLeafCount = 0;
            let emptySpaces = [];

            for (const [nx, ny] of positions) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.name === 'leaf') {
                    adjacentLeafCount++;
                } else if (grid.isEmpty(nx, ny)) {
                    emptySpaces.push([nx, ny]);
                }
            }

            // Only regrow if there's a gap (fewer than 3 adjacent leaves)
            // This creates natural sparse foliage instead of solid blobs
            if (adjacentLeafCount < 3 && emptySpaces.length > 0) {
                // Pick one random empty space
                const [nx, ny] = emptySpaces[Math.floor(Math.random() * emptySpaces.length)];
                grid.setElement(nx, ny, leafElement);
                return true;
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
        // FIXED: Only need 1 leaf neighbor to prevent cascading holes in foliage
        let leafCount = 0;
        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement && neighborElement.name === 'leaf') {
                leafCount++;
            }
        }

        return leafCount >= 1; // Supported if at least 1 leaf neighbor (prevents holes)
    }
}

export default LeafElement;
