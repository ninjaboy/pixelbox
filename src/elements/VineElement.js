import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class VineElement extends Element {
    constructor() {
        super(24, 'vine', 0x228b22, { // Forest green
            density: 2,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.75, // Somewhat resistant (moisture)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC],
            brushSize: 1,
            emissionDensity: 0.5
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize growth stage
        if (cell.data.growthStage === undefined) {
            cell.data.growthStage = 0;
            cell.data.hasLanded = false;
            cell.data.swayTimer = Math.floor(Math.random() * 60);
            cell.data.age = 0;
            cell.data.branchLength = 0;
            cell.data.vineId = Math.random(); // Unique ID for this vine chain
            cell.data.health = 100; // Health for natural die-off
        }

        cell.data.age++;

        // PERFORMANCE: Only update every 4 frames (reduces CPU by 75%)
        const shouldUpdate = (grid.frameCount + (x * 11 + y * 7) % 4) % 4 === 0;
        if (!shouldUpdate && cell.data.age > 10) return false;

        // Check if in water (seaweed behavior)
        const inWater = this.isInWater(x, y, grid);

        // SEAWEED MODE (underwater)
        if (inWater) {
            // NATURAL DIE-OFF
            if (Math.random() < 0.001) {
                cell.data.health -= 1;
            }

            if (cell.data.health <= 0) {
                grid.setElement(x, y, grid.registry.get('empty'));
                return true;
            }

            // Slow growth
            if (Math.random() > 0.98) {
                cell.data.growthStage++;
            }

            // COUNT NEARBY SEAWEED (prevent overcrowding)
            const nearbyVineCount = this.countNearbyVines(x, y, grid);

            // Stop growing if too crowded
            if (nearbyVineCount > 10) {
                // Accelerate die-off when overcrowded
                if (Math.random() < 0.005) {
                    cell.data.health -= 5;
                }
                return false;
            }

            // SMART SEAWEED GROWTH
            // Seaweed grows upward in columns with occasional branching
            if (cell.data.growthStage >= 4 && nearbyVineCount < 8 && Math.random() > 0.997) {
                // Calculate height of this seaweed strand
                const branchLength = this.calculateBranchLength(x, y, grid);

                // Stop growing if too tall (6-12 blocks)
                const maxHeight = 6 + Math.floor(Math.random() * 6);
                if (branchLength >= maxHeight) {
                    return false;
                }

                // MOSTLY UPWARD (80% up, 20% diagonal)
                const directions = [];

                // Upward growth (weighted)
                directions.push([x, y - 1], [x, y - 1], [x, y - 1], [x, y - 1]);

                // Occasional diagonal branching
                directions.push([x - 1, y - 1], [x + 1, y - 1]);

                // Shuffle
                directions.sort(() => Math.random() - 0.5);

                for (const [nx, ny] of directions) {
                    const neighbor = grid.getElement(nx, ny);

                    if (neighbor && neighbor.name === 'water') {
                        // Check for nearby support (seaweed grows in connected chains)
                        const hasNearbySupport = this.hasNearbySupport(nx, ny, grid);

                        if (hasNearbySupport) {
                            grid.setElement(nx, ny, grid.registry.get('vine'));

                            // Initialize new seaweed with inherited data
                            const newCell = grid.getCell(nx, ny);
                            if (newCell) {
                                newCell.data.vineId = cell.data.vineId;
                                newCell.data.branchLength = branchLength + 1;
                                newCell.data.health = 80 + Math.floor(Math.random() * 20);
                            }
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        // VINE MODE (on land)

        // FALLING BEHAVIOR: Fall when first placed until landing
        if (!cell.data.hasLanded) {
            const below = grid.getElement(x, y + 1);

            // Can fall through empty space
            if (!below || below.id === 0) {
                if (grid.canMoveTo(x, y, x, y + 1)) {
                    grid.swap(x, y, x, y + 1);
                    return true;
                }
            } else {
                // Landed - mark as such
                cell.data.hasLanded = true;
            }
        }

        // Must have support (ground or another vine)
        const below = grid.getElement(x, y + 1);
        const supportSurfaces = ['sand', 'wet_sand', 'stone', 'wood', 'fossil', 'salt', 'wall', 'vine', 'obsidian'];
        const hasSupport = below && (supportSurfaces.includes(below.name) || below.state === STATE.SOLID);

        // Vines die if no support
        if (!hasSupport) {
            if (Math.random() > 0.95) {
                grid.setElement(x, y, grid.registry.get('empty'));
                return true;
            }
            return false;
        }

        // NATURAL DIE-OFF for land vines
        if (Math.random() < 0.0008) {
            cell.data.health -= 1;
        }

        if (cell.data.health <= 0) {
            grid.setElement(x, y, grid.registry.get('empty'));
            return true;
        }

        // Grow and mature over time
        if (Math.random() > 0.98) {
            cell.data.growthStage++;
        }

        // COUNT NEARBY VINES (prevent overcrowding)
        const nearbyVineCount = this.countNearbyVines(x, y, grid);

        // Stop growing if too crowded
        if (nearbyVineCount > 12) {
            if (Math.random() < 0.003) {
                cell.data.health -= 5;
            }
            return false;
        }

        // SMART VINE GROWTH
        if (cell.data.growthStage >= 5 && nearbyVineCount < 10 && Math.random() > 0.996) {
            const branchLength = this.calculateBranchLength(x, y, grid);

            // Stop growing if branch is too long (5-10 blocks)
            const maxBranchLength = 5 + Math.floor(Math.random() * 5);
            if (branchLength >= maxBranchLength) {
                return false;
            }

            const above = grid.getElement(x, y - 1);

            // CLIMBING PREFERENCE (60% up, 30% horizontal, 10% diagonal)
            const directions = [];

            // Upward climbing (weighted)
            directions.push([x, y - 1], [x, y - 1], [x, y - 1]);

            // Horizontal spreading
            directions.push([x - 1, y], [x + 1, y]);

            // Diagonal climbing
            if (Math.random() > 0.7) {
                directions.push([x - 1, y - 1], [x + 1, y - 1]);
            }

            // Shuffle
            directions.sort(() => Math.random() - 0.5);

            for (const [nx, ny] of directions) {
                const neighbor = grid.getElement(nx, ny);

                if (neighbor && neighbor.id === 0) {
                    // For upward growth, check if there's a wall/support nearby (vines climb surfaces)
                    const hasNearbySupport = this.hasNearbySupport(nx, ny, grid);

                    if (hasNearbySupport) {
                        grid.setElement(nx, ny, grid.registry.get('vine'));

                        // Initialize new vine with inherited data
                        const newCell = grid.getCell(nx, ny);
                        if (newCell) {
                            newCell.data.vineId = cell.data.vineId;
                            newCell.data.branchLength = branchLength + 1;
                            newCell.data.health = 80 + Math.floor(Math.random() * 20);
                            // Mark as landed if it's horizontal growth
                            if (ny === y) {
                                newCell.data.hasLanded = true;
                            }
                        }
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Count nearby vines for density control
    countNearbyVines(x, y, grid) {
        let count = 0;
        const radius = 4;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'vine') {
                    count++;
                }
            }
        }

        return count;
    }

    // Calculate branch length from origin
    calculateBranchLength(x, y, grid) {
        // BFS to find shortest path to a non-vine block
        const visited = new Set();
        const queue = [[x, y, 0]];

        while (queue.length > 0 && visited.size < 40) {
            const [cx, cy, depth] = queue.shift();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const element = grid.getElement(cx, cy);

            // Found non-vine solid = this is the origin
            if (element && element.name !== 'vine' && element.state === STATE.SOLID) {
                return depth;
            }

            // Found non-vine water (for seaweed) = origin is bottom
            if (element && element.name !== 'vine' && element.name === 'water') {
                // Look below for solid ground
                const below = grid.getElement(cx, cy + 1);
                if (below && below.state === STATE.SOLID) {
                    return depth;
                }
            }

            // Continue searching through vine
            if (element && element.name === 'vine' && depth < 12) {
                queue.push([cx - 1, cy, depth + 1]);
                queue.push([cx + 1, cy, depth + 1]);
                queue.push([cx, cy - 1, depth + 1]);
                queue.push([cx, cy + 1, depth + 1]);
            }
        }

        return 0;
    }

    // Check if position has nearby support (vines grow from/near solid surfaces)
    hasNearbySupport(x, y, grid) {
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const element = grid.getElement(nx, ny);
            // Vines grow near solid surfaces or other vines
            if (element && (element.state === STATE.SOLID || element.name === 'vine')) {
                return true;
            }
        }

        return false;
    }

    isInWater(x, y, grid) {
        // Check if at least one adjacent cell has water
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const element = grid.getElement(nx, ny);
            if (element && element.name === 'water') {
                return true;
            }
        }

        return false;
    }
}

export default VineElement;
