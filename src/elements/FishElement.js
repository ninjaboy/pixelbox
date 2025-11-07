import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class FishElement extends Element {
    constructor() {
        // Start with default color, will be randomized on spawn
        super(17, 'fish', 0xff8c42, {
            density: 2.5, // Denser than water so water can't push fish around
            state: STATE.SOLID,
            movable: true,
            ignitionResistance: 0.0, // Burns easily
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 0, // Single pixel placement
            emissionDensity: 0.2 // 20% chance = 1-2 fish per click
        });

        // Store color variants as instance property
        this.colorVariants = [
            0xff8c42,    // Orange (clownfish)
            0x4a90e2,    // Blue (tropical)
            0xffd700,    // Gold (goldfish)
            0xff4444,    // Red (betta)
            0xc0c0c0,    // Silver
            0x2a2a2a     // Black
        ];
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize fish data AND randomize color on first update (spawn)
        if (!cell.data.swimDirection) {
            cell.data.swimDirection = Math.random() > 0.5 ? 1 : -1;
            cell.data.swimTimer = 0;
            cell.data.outOfWaterTime = 0;
            cell.data.hunger = 0; // Hunger level (0-100, higher = hungrier)
            cell.data.seekingFood = false;
            cell.data.restTimer = 0;
            cell.data.age = 0; // Fish age for natural death
            cell.data.surfaceTimer = 0; // Time spent at surface after feeding

            // Randomize color on spawn - store in cell data (not element)
            const randomColor = this.colorVariants[Math.floor(Math.random() * this.colorVariants.length)];
            cell.data.fishColor = randomColor;
        }

        // Age tracking (no natural death - only starvation kills fish)
        cell.data.age++;

        // Check if in water
        const inWater = this.isInWater(x, y, grid);

        if (!inWater) {
            // Out of water - dying!
            cell.data.outOfWaterTime++;

            // Die after 300 frames (5 seconds) out of water
            if (cell.data.outOfWaterTime > 300) {
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

        // OVERPOPULATION CONTROL: Die if too crowded
        const nearbyFishCount = this.countNearbyFish(x, y, grid, 3);
        if (nearbyFishCount > 12) { // More than 12 fish within 3 pixels = overcrowding
            // 1% chance per frame to die from stress/competition (gentle control)
            if (Math.random() < 0.01) {
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }
        }

        // HUNGER SYSTEM
        cell.data.hunger = Math.min(100, cell.data.hunger + 0.02); // Hunger increases slowly (50+ seconds between meals)

        // STARVATION DEATH: Die if hunger reaches 100
        if (cell.data.hunger >= 100) {
            grid.setElement(x, y, grid.registry.get('ash'));
            return true;
        }

        // Check if at surface (within 20% of water surface)
        const surfaceY = this.findSurfaceLevel(x, y, grid);
        const isNearSurface = surfaceY !== null && y <= surfaceY + 10;

        // Surface timer management
        if (isNearSurface && cell.data.hunger < 30) {
            // Well-fed and at surface - increment timer
            cell.data.surfaceTimer++;
        } else {
            // Reset timer when hungry or away from surface
            cell.data.surfaceTimer = 0;
        }

        // PRIORITY 0: Descend after 15 seconds at surface when well-fed
        if (cell.data.surfaceTimer > 900) { // 15 seconds at 60fps = 900 frames
            // Time to go down! Actively swim to deeper water
            if (Math.random() > 0.3) { // 70% chance to move down
                const element = grid.getElement(x, y + 1);
                if (element && element.name === 'water') {
                    grid.swap(x, y, x, y + 1);
                    return true;
                }
            }
        }

        // PRIORITY 1: Food seeking (when hungry)
        if (cell.data.hunger > 20) { // Start seeking food early to prevent starvation
            const foodLocation = this.findNearbyFood(x, y, grid);

            if (foodLocation) {
                // Found food - swim toward it
                const [foodX, foodY] = foodLocation;

                // Check if food is adjacent (can eat it)
                if (Math.abs(foodX - x) <= 1 && Math.abs(foodY - y) <= 1) {
                    // Eat the food
                    const foodElement = grid.getElement(foodX, foodY);
                    if (foodElement && (foodElement.name === 'leaf' || foodElement.name === 'ash' || foodElement.name === 'tree_seed')) {
                        grid.setElement(foodX, foodY, grid.registry.get('empty'));
                        cell.data.hunger = Math.max(0, cell.data.hunger - 50); // Reduce hunger
                        cell.data.seekingFood = false;

                        // REPRODUCTION: If well-fed and not overcrowded, reproduce
                        if (cell.data.hunger < 40 && nearbyFishCount < 8) {
                            if (Math.random() < 0.5) { // 50% chance to reproduce when conditions are good
                                this.reproduce(x, y, grid);
                            }
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
                // No food found - wander toward surface to look for food
                cell.data.seekingFood = false;
                if (cell.data.hunger > 60) { // Very hungry - actively swim to surface
                    if (surfaceY !== null && surfaceY < y - 2) {
                        // Swim upward toward surface - FAST when very hungry
                        if (Math.random() > 0.2) { // 80% chance to move
                            const element = grid.getElement(x, y - 1);
                            if (element && element.name === 'water') {
                                grid.swap(x, y, x, y - 1);
                                return true;
                            }
                        }
                    }
                }
            }
        } else {
            // Well-fed - but don't descend here, let surfaceTimer handle it
            cell.data.seekingFood = false;
        }

        // PRIORITY 2: Schooling behavior (only when not seeking food)
        if (!cell.data.seekingFood) {
            const schoolInfo = this.analyzeSchool(x, y, grid);

            if (schoolInfo.nearbyFish > 0) {
                // Apply boids-like behavior
                const schoolDirection = this.calculateSchoolDirection(x, y, schoolInfo);

                // 10% chance to follow school
                if (Math.random() > 0.9 && schoolDirection) {
                    const [targetX, targetY] = schoolDirection;
                    const element = grid.getElement(targetX, targetY);
                    if (element && element.name === 'water') {
                        grid.swap(x, y, targetX, targetY);
                        // Update swim direction to match school
                        cell.data.swimDirection = Math.sign(targetX - x) || cell.data.swimDirection;
                        return true;
                    }
                }
            }
        }

        // PRIORITY 3: Regular swimming behavior
        cell.data.swimTimer++;

        // Resting behavior
        if (cell.data.restTimer > 0) {
            cell.data.restTimer--;
            if (Math.random() > 0.9) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const element = grid.getElement(x + dir, y);
                if (element && element.name === 'water') {
                    grid.swap(x, y, x + dir, y);
                }
            }
            return false;
        }

        // Randomly enter rest state
        if (Math.random() > 0.96) {
            cell.data.restTimer = 60 + Math.floor(Math.random() * 120);
            return false;
        }

        // Change direction occasionally
        if (cell.data.swimTimer > 60 && Math.random() > 0.97) {
            cell.data.swimDirection *= -1;
            cell.data.swimTimer = 0;
        }

        // Swim through water VERY SLOW (15% movement chance)
        if (Math.random() > 0.85) {
            const dir = cell.data.swimDirection;

            // Primarily swim horizontally
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

            // Gentle vertical drift
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

    // Count nearby fish for population control
    countNearbyFish(x, y, grid, radius) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'fish') {
                    count++;
                }
            }
        }
        return count;
    }

    // Find surface level (where water meets air/empty)
    findSurfaceLevel(x, y, grid) {
        for (let checkY = y; checkY >= 0; checkY--) {
            const element = grid.getElement(x, checkY);
            if (!element || element.name !== 'water') {
                return checkY + 1; // Return water level just below surface
            }
        }
        return null;
    }

    // Analyze nearby fish for schooling behavior
    analyzeSchool(x, y, grid) {
        let nearbyFish = 0;
        let avgX = 0;
        let avgY = 0;
        let avgDirection = 0;
        const radius = 5; // Check 5-pixel radius for school

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'fish') {
                    nearbyFish++;
                    avgX += (x + dx);
                    avgY += (y + dy);

                    // Try to get direction of other fish
                    const otherCell = grid.getCell(x + dx, y + dy);
                    if (otherCell && otherCell.data.swimDirection) {
                        avgDirection += otherCell.data.swimDirection;
                    }
                }
            }
        }

        if (nearbyFish > 0) {
            avgX = Math.floor(avgX / nearbyFish);
            avgY = Math.floor(avgY / nearbyFish);
            avgDirection = avgDirection / nearbyFish;
        }

        return {
            nearbyFish,
            centerX: avgX,
            centerY: avgY,
            avgDirection
        };
    }

    // Calculate direction to move based on school behavior (boids algorithm)
    calculateSchoolDirection(x, y, schoolInfo) {
        let targetX = x;
        let targetY = y;

        const dx = schoolInfo.centerX - x;
        const dy = schoolInfo.centerY - y;

        // IMPROVED SEPARATION: Don't get too close (avoid clumping)
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 3) { // Too close - MOVE AWAY to avoid clumping
            targetX = x - Math.sign(dx);
            targetY = y - Math.sign(dy);
        } else if (distance > 5) {
            // Far from school, move toward center (cohesion)
            targetX = x + Math.sign(dx);
            targetY = y + Math.sign(dy);
        } else {
            // Good distance, move in average direction (alignment)
            targetX = x + Math.sign(schoolInfo.avgDirection || dx);
            targetY = y;
        }

        // Clamp to adjacent cells only
        targetX = Math.max(x - 1, Math.min(x + 1, targetX));
        targetY = Math.max(y - 1, Math.min(y + 1, targetY));

        return [targetX, targetY];
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

    findNearbyFood(x, y, grid) {
        // Search in a wider radius for food (leaves, ash, or seeds)
        const searchRadius = 12; // Increased from 8 to 12

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && (element.name === 'leaf' || element.name === 'ash' || element.name === 'tree_seed')) {
                    // Food found! Fish can eat it regardless of position
                    // (even if it's floating on surface or underwater)
                    return [x + dx, y + dy];
                }
            }
        }

        return null;
    }

    swimToward(x, y, targetX, targetY, grid) {
        // Calculate direction to target
        const dx = targetX - x;
        const dy = targetY - y;

        // Move vertically if needed (toward surface usually) - FASTER when seeking food
        if (Math.abs(dy) > 0 && Math.random() > 0.1) { // 90% chance (was 70%)
            const vertDir = dy > 0 ? 1 : -1;
            const element = grid.getElement(x, y + vertDir);
            // ONLY move into water, never into empty space (prevents jumping out)
            if (element && element.name === 'water') {
                grid.swap(x, y, x, y + vertDir);
                return true;
            }
        }

        // Move horizontally toward food - FASTER when seeking food
        if (Math.abs(dx) > 0 && Math.random() > 0.1) { // 90% chance (was 70%)
            const horizDir = dx > 0 ? 1 : -1;
            const element = grid.getElement(x + horizDir, y);
            // ONLY move into water, never into empty space (prevents jumping out)
            if (element && element.name === 'water') {
                grid.swap(x, y, x + horizDir, y);
                return true;
            }
        }

        // Try diagonal movement
        if (Math.abs(dx) > 0 && Math.abs(dy) > 0) {
            const horizDir = dx > 0 ? 1 : -1;
            const vertDir = dy > 0 ? 1 : -1;
            const element = grid.getElement(x + horizDir, y + vertDir);
            // ONLY move into water, never into empty space (prevents jumping out)
            if (element && element.name === 'water') {
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
