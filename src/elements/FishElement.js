import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class FishElement extends Element {
    constructor() {
        // Randomize color: 70% black fish, 30% golden fish
        const isGolden = Math.random() > 0.7;
        const color = isGolden ? 0xffd700 : 0x1a1a1a; // Golden or black

        super(17, 'fish', color, {
            density: 2.5, // Denser than water (2.0) so water can't push fish around
            state: STATE.SOLID,
            movable: true,
            ignitionResistance: 0.0, // Burns easily
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 0, // Single pixel placement
            emissionDensity: 0.2 // 20% chance = 1-2 fish per click
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize fish data
        if (!cell.data.swimDirection) {
            cell.data.swimDirection = Math.random() > 0.5 ? 1 : -1;
            cell.data.swimTimer = 0;
            cell.data.outOfWaterTime = 0;
            cell.data.foodEaten = 0; // Track food consumption for reproduction
            cell.data.seekingFood = false; // Track if actively seeking food
        }

        // Check if in water
        const inWater = this.isInWater(x, y, grid);

        if (!inWater) {
            // Out of water - dying!
            cell.data.outOfWaterTime++;

            // Die after 60 frames (1 second) out of water
            if (cell.data.outOfWaterTime > 60) {
                // Turn into ash (dried fish)
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }

            // Flop around on land (minimal movement)
            if (Math.random() > 0.95) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const newX = x + dir;
                if (grid.isEmpty(newX, y)) {
                    grid.swap(x, y, newX, y);
                    return true;
                }
            }

            return false;
        }

        // In water - reset death timer
        cell.data.outOfWaterTime = 0;

        // Check for food at surface (leaves or ash/dead fish)
        const foodLocation = this.findNearbyFood(x, y, grid);
        if (foodLocation) {
            // Found food nearby - try to move toward it and eat it
            const [foodX, foodY] = foodLocation;

            // Check if food is adjacent (can eat it)
            if (Math.abs(foodX - x) <= 1 && Math.abs(foodY - y) <= 1) {
                // Eat the food
                const foodElement = grid.getElement(foodX, foodY);
                if (foodElement && (foodElement.name === 'leaf' || foodElement.name === 'ash' || foodElement.name === 'tree_seed')) {
                    grid.setElement(foodX, foodY, grid.registry.get('empty'));
                    cell.data.foodEaten++;
                    cell.data.seekingFood = false;

                    // After eating 2 pieces of food, reproduce
                    if (cell.data.foodEaten >= 2) {
                        this.reproduce(x, y, grid);
                        cell.data.foodEaten = 0; // Reset counter
                    }
                    return true;
                }
            } else {
                // Food is not adjacent - swim toward it
                cell.data.seekingFood = true;
                if (this.swimToward(x, y, foodX, foodY, grid)) {
                    return true;
                }
            }
        } else {
            cell.data.seekingFood = false;
        }

        // Check for nearby fish and occasionally kill each other (keep population scarce)
        if (Math.random() > 0.995) { // 0.5% chance per frame
            const nearbyFish = this.findNearbyFish(x, y, grid);
            if (nearbyFish) {
                // Kill the other fish
                grid.setElement(nearbyFish[0], nearbyFish[1], grid.registry.get('ash'));
                return true;
            }
        }

        // Swimming behavior - smooth, directional movement
        cell.data.swimTimer++;

        // Change direction occasionally (every 60-120 frames)
        if (cell.data.swimTimer > 60 && Math.random() > 0.97) {
            cell.data.swimDirection *= -1;
            cell.data.swimTimer = 0;
        }

        // Swim through water more frequently (70% movement chance)
        if (Math.random() > 0.3) {
            const dir = cell.data.swimDirection;

            // Primarily swim horizontally (70% of the time)
            if (Math.random() > 0.3) {
                const newX = x + dir;
                const targetElement = grid.getElement(newX, y);
                if (targetElement && targetElement.name === 'water') {
                    grid.swap(x, y, newX, y);
                    return true;
                }

                // If blocked horizontally, try diagonal
                const verticalDir = Math.random() > 0.5 ? 1 : -1;
                const diagonalElement = grid.getElement(newX, y + verticalDir);
                if (diagonalElement && diagonalElement.name === 'water') {
                    grid.swap(x, y, newX, y + verticalDir);
                    return true;
                }
            }

            // Gentle vertical drift (prefer staying at current depth)
            if (Math.random() > 0.8) {
                const verticalDir = Math.random() > 0.5 ? 1 : -1;
                const newY = y + verticalDir;
                const targetElement = grid.getElement(x, newY);
                if (targetElement && targetElement.name === 'water') {
                    grid.swap(x, y, x, newY);
                    return true;
                }
            }
        }

        return false;
    }

    findNearbyFish(x, y, grid) {
        // Check adjacent cells for other fish
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const element = grid.getElement(nx, ny);
            if (element && element.name === 'fish') {
                return [nx, ny];
            }
        }

        return null;
    }

    isInWater(x, y, grid) {
        // Check if fish is surrounded by water (at least one adjacent water)
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

    isWater(x, y, grid) {
        const element = grid.getElement(x, y);
        return element && element.name === 'water';
    }

    findNearbyFood(x, y, grid) {
        // Search in a wider radius for food (leaves, ash, or seeds)
        const searchRadius = 8;

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && (element.name === 'leaf' || element.name === 'ash' || element.name === 'tree_seed')) {
                    // Check if food is at or near surface (has empty space or water above it)
                    const above = grid.getElement(x + dx, y + dy - 1);
                    if (above && (above.name === 'empty' || above.name === 'water')) {
                        return [x + dx, y + dy];
                    }
                }
            }
        }

        return null;
    }

    swimToward(x, y, targetX, targetY, grid) {
        // Calculate direction to target
        const dx = targetX - x;
        const dy = targetY - y;

        // Prioritize movement toward food
        let moved = false;

        // Move vertically if needed (toward surface usually)
        if (Math.abs(dy) > 0 && Math.random() > 0.3) {
            const vertDir = dy > 0 ? 1 : -1;
            const element = grid.getElement(x, y + vertDir);
            if (element && (element.name === 'water' || element.name === 'empty')) {
                grid.swap(x, y, x, y + vertDir);
                return true;
            }
        }

        // Move horizontally toward food
        if (Math.abs(dx) > 0 && Math.random() > 0.3) {
            const horizDir = dx > 0 ? 1 : -1;
            const element = grid.getElement(x + horizDir, y);
            if (element && (element.name === 'water' || element.name === 'empty')) {
                grid.swap(x, y, x + horizDir, y);
                return true;
            }
        }

        // Try diagonal movement
        if (Math.abs(dx) > 0 && Math.abs(dy) > 0) {
            const horizDir = dx > 0 ? 1 : -1;
            const vertDir = dy > 0 ? 1 : -1;
            const element = grid.getElement(x + horizDir, y + vertDir);
            if (element && (element.name === 'water' || element.name === 'empty')) {
                grid.swap(x, y, x + horizDir, y + vertDir);
                return true;
            }
        }

        return false;
    }

    reproduce(x, y, grid) {
        // Spawn a new fish nearby
        const spawnOffsets = [
            [0, -1], [0, 1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1],
            [0, -2], [0, 2], [-2, 0], [2, 0]
        ];

        // Shuffle spawn positions
        spawnOffsets.sort(() => Math.random() - 0.5);

        for (const [dx, dy] of spawnOffsets) {
            const spawnX = x + dx;
            const spawnY = y + dy;
            const element = grid.getElement(spawnX, spawnY);

            // Spawn in water
            if (element && element.name === 'water') {
                grid.setElement(spawnX, spawnY, grid.registry.get('fish'));
                return true;
            }
        }

        return false;
    }
}

export default FishElement;
