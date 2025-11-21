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
            0xffd700,    // Gold (goldfish)
            0xff4444,    // Red (betta)
            0x2a2a2a     // Black
        ];
    }

    updateImpl(x, y, grid) {
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
            cell.data.feedingStartTime = null; // When fish started feeding
            cell.data.feedingCooldown = 0; // Frames until can eat again (3 game hours)

            // PERFORMANCE: Cache expensive lookups
            cell.data.cachedSurfaceY = null;
            cell.data.cachedFoodLocation = null;
            cell.data.cachedNearbyFishCount = 0;
            cell.data.cacheFrame = 0;

            // Randomize color on spawn - store in cell data (not element)
            const randomColor = this.colorVariants[Math.floor(Math.random() * this.colorVariants.length)];
            cell.data.fishColor = randomColor;
        }

        // Age tracking (no natural death - only starvation kills fish)
        cell.data.age++;

        // PERFORMANCE: Update fish AI every 5 frames (reduces CPU by 80%)
        // Still allows for basic movement and physics every frame
        const shouldUpdateAI = (grid.frameCount + (x + y) % 5) % 5 === 0;

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

            // FALL DOWN when in air (gravity)
            const below = grid.getElement(x, y + 1);
            if (below && below.name === 'empty') {
                // Fall through air
                grid.swap(x, y, x, y + 1);
                return true;
            }

            // On solid ground - flop around desperately
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

        // PERFORMANCE: Cache nearby fish count (only update every 5 frames)
        let nearbyFishCount = cell.data.cachedNearbyFishCount;
        if (shouldUpdateAI) {
            nearbyFishCount = this.countNearbyFish(x, y, grid, 3); // Reduced radius from 5 to 3 for performance
            cell.data.cachedNearbyFishCount = nearbyFishCount;
        }

        // OVERPOPULATION CONTROL: No death, but track stress level for reproduction
        // Fish don't die from crowding, but become sterile when stressed
        const isStressed = nearbyFishCount > 4; // More than 4 nearby = stressed

        // FEEDING COOLDOWN SYSTEM
        // Decrement cooldown timer if active
        if (cell.data.feedingCooldown > 0) {
            cell.data.feedingCooldown--;
        }

        // Check if fish has been feeding for too long (7 real seconds = 420 frames)
        if (cell.data.feedingStartTime !== null) {
            const feedingDuration = cell.data.age - cell.data.feedingStartTime;
            if (feedingDuration >= 420) {
                // Stop feeding - enter 3 game hour cooldown (1250 frames ~21 seconds)
                cell.data.feedingCooldown = 1250;
                cell.data.feedingStartTime = null;
                cell.data.seekingFood = false;
            }
        }

        // HUNGER SYSTEM
        cell.data.hunger = Math.min(100, cell.data.hunger + 0.015); // Hunger increases slowly (66+ seconds between meals)

        // NO STARVATION DEATH: Fish just get increasingly desperate for food
        // High hunger makes them sterile (can't reproduce) but they never die from starvation
        const isStarving = cell.data.hunger >= 70; // Very hungry = can't reproduce

        // CORAL SYMBIOSIS: Being near coral provides passive nutrition (microorganisms)
        const nearCoral = this.isNearCoral(x, y, grid);
        if (nearCoral && cell.data.hunger > 0) {
            // Slowly reduce hunger when near coral (10x slower than eating)
            cell.data.hunger = Math.max(0, cell.data.hunger - 0.007); // Very gradual
        }

        // PERFORMANCE: Cache surface level lookup (only update every 3 frames)
        let surfaceY = cell.data.cachedSurfaceY;
        if (shouldUpdateAI) {
            surfaceY = this.findSurfaceLevel(x, y, grid);
            cell.data.cachedSurfaceY = surfaceY;
        }
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

        // PRIORITY 1: Food seeking (when hungry AND not on cooldown)
        if (cell.data.hunger > 20 && cell.data.feedingCooldown === 0) { // Can only eat if cooldown is over
            // PERFORMANCE: Cache food location lookup (only update every 5 frames)
            let foodLocation = cell.data.cachedFoodLocation;
            if (shouldUpdateAI) {
                // First look for traditional food (leaves, ash, seeds)
                foodLocation = this.findNearbyFood(x, y, grid);
                // If no traditional food and moderately hungry, seek corals for passive nutrition
                if (!foodLocation && cell.data.hunger > 40) {
                    foodLocation = this.findNearbyCoral(x, y, grid);
                }
                cell.data.cachedFoodLocation = foodLocation;
            }

            if (foodLocation) {
                // Found food - swim toward it
                const [foodX, foodY] = foodLocation;

                // Start feeding timer when first approaching food
                if (cell.data.feedingStartTime === null) {
                    cell.data.feedingStartTime = cell.data.age;
                }

                // Check if food is adjacent (can eat it)
                if (Math.abs(foodX - x) <= 1 && Math.abs(foodY - y) <= 1) {
                    // Eat the food
                    const foodElement = grid.getElement(foodX, foodY);

                    // CORAL: Don't eat coral, just hang around it for passive nutrition
                    if (foodElement && foodElement.name === 'coral') {
                        // Reached coral - just stay nearby, don't consume it
                        // Hunger will slowly decrease from passive nutrition (see CORAL SYMBIOSIS above)
                        cell.data.seekingFood = false;
                        cell.data.cachedFoodLocation = null;
                        // Don't start feeding timer for coral
                        cell.data.feedingStartTime = null;
                        return false; // Don't move, just chill near coral
                    }

                    // Traditional food (leaves, ash, seeds) - consume it
                    if (foodElement && (foodElement.name === 'leaf' || foodElement.name === 'ash' || foodElement.name === 'tree_seed')) {
                        grid.setElement(foodX, foodY, grid.registry.get('empty'));
                        cell.data.hunger = Math.max(0, cell.data.hunger - 70); // Reduce hunger significantly
                        cell.data.seekingFood = false;
                        cell.data.cachedFoodLocation = null; // Clear cache after eating

                        // REPRODUCTION: Very strict conditions to maintain stable population
                        // Fish can only reproduce when: well-fed, not stressed, not starving, not overcrowded
                        const canReproduce =
                            cell.data.hunger < 20 &&  // Very well-fed (was 30)
                            !isStressed &&             // Not stressed from crowding
                            !isStarving &&             // Not starving
                            nearbyFishCount < 3;       // Maximum 2 nearby fish (was 6)

                        if (canReproduce) {
                            if (Math.random() < 0.05) { // Only 5% chance to lay egg (was 15%)
                                this.layEgg(x, y, grid);
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
                // No food found - reset feeding timer
                cell.data.feedingStartTime = null;
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

        // PRIORITY 3: Active exploration when not feeding
        cell.data.swimTimer++;

        // IMPROVED VERTICAL DISTRIBUTION: Fish should spread throughout water column
        // When on cooldown or well-fed, actively explore different depths
        if (cell.data.feedingCooldown > 0 || cell.data.hunger < 30) {
            // Initialize or update exploration target depth
            if (cell.data.targetDepth === undefined || Math.random() > 0.99) {
                // Pick a random depth to explore (but stay away from bottom!)
                if (surfaceY !== null) {
                    const waterDepth = grid.height - surfaceY;
                    // Keep fish at least 5 pixels above the bottom
                    const maxDepth = Math.max(waterDepth - 5, 0);
                    cell.data.targetDepth = surfaceY + Math.floor(Math.random() * maxDepth);
                } else {
                    cell.data.targetDepth = y;
                }
            }

            // Swim toward target depth
            if (cell.data.targetDepth !== undefined) {
                const depthDiff = cell.data.targetDepth - y;

                // Move vertically toward target (40% chance)
                if (Math.abs(depthDiff) > 2 && Math.random() > 0.6) {
                    const vertDir = depthDiff > 0 ? 1 : -1;
                    const element = grid.getElement(x, y + vertDir);
                    if (element && element.name === 'water') {
                        grid.swap(x, y, x, y + vertDir);
                        return true;
                    }
                }
            }
        }

        // Resting behavior (less frequent)
        if (cell.data.restTimer > 0) {
            cell.data.restTimer--;
            // Even when resting, drift a bit
            if (Math.random() > 0.85) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const element = grid.getElement(x + dir, y);
                if (element && element.name === 'water') {
                    grid.swap(x, y, x + dir, y);
                }
            }
            return false;
        }

        // Randomly enter rest state (rarer than before)
        if (Math.random() > 0.985) {
            cell.data.restTimer = 30 + Math.floor(Math.random() * 60); // Shorter rest periods
            return false;
        }

        // Change direction occasionally
        if (cell.data.swimTimer > 60 && Math.random() > 0.97) {
            cell.data.swimDirection *= -1;
            cell.data.swimTimer = 0;
        }

        // INCREASED SWIMMING ACTIVITY (30% movement chance, up from 15%)
        if (Math.random() > 0.7) {
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

            // MORE ACTIVE vertical movement (50% chance, up from 20%)
            // WITH BOTTOM AVOIDANCE: Fish prefer to stay above the bottom
            if (Math.random() > 0.5) {
                // Find bottom of water body (where water meets non-water below)
                let bottomDistance = 0;
                for (let checkY = y + 1; checkY < grid.height; checkY++) {
                    const element = grid.getElement(x, checkY);
                    if (!element || element.name !== 'water') {
                        bottomDistance = checkY - y - 1;
                        break;
                    }
                    // Limit search to avoid performance issues
                    if (checkY - y > 10) {
                        bottomDistance = 10; // Far from bottom
                        break;
                    }
                }

                // Add strong upward bias when near bottom
                let upwardBias = 0.5; // Default 50/50
                if (bottomDistance <= 3) {
                    upwardBias = 0.85; // 85% chance to move up when very close to bottom
                } else if (bottomDistance <= 6) {
                    upwardBias = 0.70; // 70% chance to move up when near bottom
                }

                const verticalDir = Math.random() < upwardBias ? -1 : 1; // Negative = up
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
        const radius = 3; // PERFORMANCE: Reduced from 5 to 3 for faster scanning

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
        const searchRadius = 7; // PERFORMANCE: Reduced from 12 to 7 for faster scanning

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

    layEgg(x, y, grid) {
        // Lay an egg nearby in water
        const spawnOffsets = [
            [0, 1], [0, 2], // Prefer laying below
            [-1, 1], [1, 1],
            [0, -1], [-1, 0], [1, 0],
            [-1, -1], [1, -1], [-1, 1], [1, 1]
        ];

        // Shuffle spawn positions
        spawnOffsets.sort(() => Math.random() - 0.5);

        for (const [dx, dy] of spawnOffsets) {
            const spawnX = x + dx;
            const spawnY = y + dy;
            const element = grid.getElement(spawnX, spawnY);

            // Lay egg in water
            if (element && element.name === 'water') {
                grid.setElement(spawnX, spawnY, grid.registry.get('fish_egg'));
                return true;
            }
        }

        return false;
    }

    reproduce(x, y, grid) {
        // Spawn a new fish nearby (kept as fallback)
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

    isNearCoral(x, y, grid) {
        // Check if coral is nearby (within 3 pixels)
        const radius = 3;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'coral') {
                    return true;
                }
            }
        }
        return false;
    }

    findNearbyCoral(x, y, grid) {
        // Search for coral in a moderate radius (8 pixels)
        const searchRadius = 8;

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'coral') {
                    return [x + dx, y + dy];
                }
            }
        }

        return null;
    }
}

export default FishElement;
