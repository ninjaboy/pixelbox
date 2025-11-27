import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class LeafElement extends Element {
    constructor() {
        super(13, 'leaf', 0x32cd32, { // Lime green - brighter and more vibrant
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

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Get season data (v4.0.0)
        const seasonData = grid.seasonData;
        const season = seasonData ? seasonData.season : 'summer';

        // Initialize seasonal color if not set
        if (!cell.data.leafColor && seasonData) {
            // Get seasonal color from season system
            const seasonColors = {
                spring: [0x90EE90, 0x98FB98, 0x9ACD32],
                summer: [0x228B22, 0x2E8B57, 0x3CB371],
                autumn: [0xFFD700, 0xFFA500, 0xFF8C00, 0xFF6347, 0xFF4500, 0xDC143C],
                winter: [0x8B7355]
            };
            const colors = seasonColors[season] || seasonColors.summer;
            cell.data.leafColor = colors[Math.floor(Math.random() * colors.length)];
        }

        // Apply seasonal color to leaf
        if (cell.data.leafColor) {
            cell.element.color = cell.data.leafColor;
        }

        // Check if leaf is still on the tree or has fallen
        const hasSupport = this.checkSupport(x, y, grid);

        // SEASONAL LEAF FALLING (v4.0.0) - leaves fall in autumn/winter
        if (hasSupport && seasonData) {
            // Autumn: leaves fall gradually
            if (season === 'autumn') {
                const fallRate = 0.002; // 0.2% chance per frame
                if (Math.random() < fallRate) {
                    // Detach from tree - mark as fallen
                    cell.data.detached = true;
                }
            }
            // Winter: remaining leaves fall faster
            else if (season === 'winter') {
                const fallRate = 0.005; // 0.5% chance per frame
                if (Math.random() < fallRate) {
                    cell.data.detached = true;
                }
            }
        }

        // If detached, leaf should fall even if still supported
        const isFalling = !hasSupport || cell.data.detached;

        // CRITICAL: Only age leaves that have FALLEN from the tree
        // Leaves on the tree stay green forever (unless detached by season)
        if (isFalling) {
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
            // Leaf is still on tree - reset age and use seasonal color
            cell.data.age = 0;
            cell.data.detached = false; // Reset detached flag
            // Color is already set by seasonal logic above
        }

        // Gentle sway (very occasional small movement) - only for tree leaves
        if (hasSupport && Math.random() > 0.999) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
        }

        // MINIMAL REGROWTH: Only regrow occasionally to fill critical gaps
        // Much rarer to prevent overgrowth
        if (hasSupport && Math.random() > 0.9999) { // 0.01% chance per frame (very rare)
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

            // Only regrow if there's a significant gap (fewer than 2 adjacent leaves)
            // Even more restrictive to prevent overgrowth
            if (adjacentLeafCount < 2 && emptySpaces.length > 0) {
                // Pick one random empty space
                const [nx, ny] = emptySpaces[Math.floor(Math.random() * emptySpaces.length)];
                grid.setElement(nx, ny, leafElement);
                return true;
            }
        }

        return false;
    }

    checkSupport(x, y, grid) {
        // Use BFS to check if this leaf is connected to wood within reasonable distance
        const maxDistance = 8; // Max leaf chain length to wood
        const visited = new Set();
        const queue = [[x, y, 0]]; // [x, y, distance]
        visited.add(`${x},${y}`);

        while (queue.length > 0) {
            const [cx, cy, dist] = queue.shift();

            // Too far from any wood - unsupported
            if (dist > maxDistance) {
                continue;
            }

            const neighbors = [
                [cx, cy - 1], [cx, cy + 1], [cx - 1, cy], [cx + 1, cy]
            ];

            for (const [nx, ny] of neighbors) {
                const key = `${nx},${ny}`;
                if (visited.has(key)) continue;
                visited.add(key);

                const neighborElement = grid.getElement(nx, ny);
                if (!neighborElement) continue;

                const name = neighborElement.name;

                // Found wood - this leaf is supported!
                if (name === 'tree_trunk' || name === 'tree_branch' ||
                    name === 'wood' || name === 'burning_wood') {
                    return true;
                }

                // Found another leaf - continue searching through it
                if (name === 'leaf') {
                    queue.push([nx, ny, dist + 1]);
                }
            }
        }

        // No wood found within maxDistance - unsupported
        return false;
    }
}

export default LeafElement;
