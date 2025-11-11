import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class CoralElement extends Element {
    constructor() {
        super(34, 'coral', 0xff6b9d, { // Pink coral
            density: 8,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.9, // Resistant to fire when wet
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 1,
            emissionDensity: 0.5
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize growth data
        if (cell.data.growthStage === undefined) {
            cell.data.growthStage = 0;
            cell.data.outOfWaterTime = 0;
            cell.data.age = 0;
            cell.data.branchLength = 0; // Track how long this branch is
            cell.data.coralId = Math.random(); // Unique ID for this coral colony
            cell.data.health = 100; // Health for natural die-off
        }

        cell.data.age++;

        // PERFORMANCE: Only update every 5 frames (reduces CPU by 80%)
        const shouldUpdate = (grid.frameCount + (x * 7 + y * 13) % 5) % 5 === 0;
        if (!shouldUpdate && cell.data.age > 10) return false; // Always update first 10 frames

        // Check if in water
        const inWater = this.isInWater(x, y, grid);

        if (!inWater) {
            // Out of water - coral dies and becomes stone
            cell.data.outOfWaterTime++;

            // Die after 300 frames (5 seconds) out of water
            if (cell.data.outOfWaterTime > 300) {
                grid.setElement(x, y, grid.registry.get('stone'));
                return true;
            }
        } else {
            // In water - reset death timer
            cell.data.outOfWaterTime = 0;

            // NATURAL DIE-OFF: Coral slowly degrades and can die
            if (Math.random() < 0.001) { // 0.1% chance per update
                cell.data.health -= 1;
            }

            // Die when health reaches 0
            if (cell.data.health <= 0) {
                grid.setElement(x, y, grid.registry.get('stone'));
                return true;
            }

            // Slow growth (age)
            if (Math.random() > 0.97) {
                cell.data.growthStage++;
            }

            // COUNT NEARBY CORAL (prevent overcrowding)
            const nearbyCoralCount = this.countNearbyCoral(x, y, grid);

            // Stop growing if too crowded (more than 12 coral within 5 pixels)
            if (nearbyCoralCount > 12) {
                // Accelerate die-off when overcrowded
                if (Math.random() < 0.005) {
                    cell.data.health -= 5;
                }
                return false;
            }

            // SMART BRANCHING GROWTH
            // Only grow if: mature enough, not too crowded, random chance
            if (cell.data.growthStage >= 5 && nearbyCoralCount < 10 && Math.random() > 0.995) {
                // Calculate branch length from origin
                const branchLength = this.calculateBranchLength(x, y, grid);

                // Stop growing if branch is too long (5-10 blocks max)
                const maxBranchLength = 5 + Math.floor(Math.random() * 5);
                if (branchLength >= maxBranchLength) {
                    return false;
                }

                // HORIZONTAL PREFERENCE (70% horizontal, 30% vertical)
                const directions = [];

                // Add horizontal directions multiple times (weighted)
                directions.push([x - 1, y], [x + 1, y], [x - 1, y], [x + 1, y]);

                // Add vertical/diagonal directions (less common)
                directions.push([x, y + 1], [x - 1, y + 1], [x + 1, y + 1]);

                // Rare upward growth
                if (Math.random() > 0.8) {
                    directions.push([x, y - 1]);
                }

                // Shuffle
                directions.sort(() => Math.random() - 0.5);

                for (const [nx, ny] of directions) {
                    const neighbor = grid.getElement(nx, ny);

                    // Only grow into water (not empty space)
                    if (neighbor && neighbor.name === 'water') {
                        // Check if target position is near solid ground (coral grows from surfaces)
                        const hasNearbySupport = this.hasNearbySupport(nx, ny, grid);

                        if (hasNearbySupport) {
                            const newCoral = grid.registry.get('coral');
                            grid.setElement(nx, ny, newCoral);

                            // Initialize new coral with inherited data
                            const newCell = grid.getCell(nx, ny);
                            if (newCell) {
                                newCell.data.coralId = cell.data.coralId;
                                newCell.data.branchLength = branchLength + 1;
                                newCell.data.health = 80 + Math.floor(Math.random() * 20); // New coral starts with 80-100 health
                            }
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    // Count nearby coral for density control
    countNearbyCoral(x, y, grid) {
        let count = 0;
        const radius = 5;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'coral') {
                    count++;
                }
            }
        }

        return count;
    }

    // Calculate how far this coral is from the origin
    calculateBranchLength(x, y, grid) {
        // BFS to find shortest path to a non-coral block
        const visited = new Set();
        const queue = [[x, y, 0]];

        while (queue.length > 0 && visited.size < 50) { // Limit search for performance
            const [cx, cy, depth] = queue.shift();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const element = grid.getElement(cx, cy);

            // Found non-coral solid = this is the origin
            if (element && element.name !== 'coral' && element.state === STATE.SOLID) {
                return depth;
            }

            // Continue searching through coral
            if (element && element.name === 'coral' && depth < 15) {
                queue.push([cx - 1, cy, depth + 1]);
                queue.push([cx + 1, cy, depth + 1]);
                queue.push([cx, cy - 1, depth + 1]);
                queue.push([cx, cy + 1, depth + 1]);
            }
        }

        return 0; // Default if not found
    }

    // Check if position has nearby support (coral grows from solid surfaces)
    hasNearbySupport(x, y, grid) {
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const element = grid.getElement(nx, ny);
            // Coral grows near solid surfaces or other coral
            if (element && (element.state === STATE.SOLID || element.name === 'coral')) {
                return true;
            }
        }

        return false;
    }

    isInWater(x, y, grid) {
        // Check if coral is surrounded by water (at least one adjacent water)
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

export default CoralElement;
