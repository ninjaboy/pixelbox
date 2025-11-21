import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class BirdElement extends Element {
    constructor() {
        // White birds
        super(42, 'bird', 0xffffff, {
            density: 1.5, // Light so they can fly easily
            state: STATE.SOLID,
            movable: true,
            ignitionResistance: 0.0, // Burns easily
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 0, // Single pixel placement
            emissionDensity: 0.2 // 20% chance = 1-2 birds per click
        });

        // Color variants (mostly white shades)
        this.colorVariants = [
            0xffffff,    // Pure white
            0xf5f5f5,    // White smoke
            0xf0f0f0,    // Light gray-white
            0xe8e8e8     // Platinum
        ];
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize bird data on first update (spawn)
        if (!cell.data.flyDirection) {
            cell.data.flyDirection = Math.random() > 0.5 ? 1 : -1;
            cell.data.flyTimer = 0;
            cell.data.hunger = 0; // Hunger level (0-100, higher = hungrier)
            cell.data.seekingFood = false;
            cell.data.age = 0;
            cell.data.feedingStartTime = null;
            cell.data.feedingCooldown = 0; // Frames until can eat again
            cell.data.perchTimer = 0; // Time spent perching
            cell.data.isPerching = false;
            cell.data.altitude = y; // Target altitude for flying
            cell.data.glidePhase = 0; // For smooth bobbing motion

            // PERFORMANCE: Cache expensive lookups
            cell.data.cachedTreeLocation = null;
            cell.data.cachedFoodLocation = null;
            cell.data.cachedNearbyBirdCount = 0;
            cell.data.cacheFrame = 0;

            // Randomize color on spawn
            const randomColor = this.colorVariants[Math.floor(Math.random() * this.colorVariants.length)];
            cell.data.birdColor = randomColor;
        }

        // Age tracking
        cell.data.age++;

        // PERFORMANCE: Update bird AI every 3 frames (reduces CPU by 66%)
        const shouldUpdateAI = (grid.frameCount + (x + y) % 3) % 3 === 0;

        // FEEDING COOLDOWN SYSTEM
        if (cell.data.feedingCooldown > 0) {
            cell.data.feedingCooldown--;
        }

        // Check if bird has been feeding for too long (7 real seconds = 420 frames)
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
        cell.data.hunger = Math.min(100, cell.data.hunger + 0.015); // Same rate as fish

        // PERFORMANCE: Cache nearby bird count
        let nearbyBirdCount = cell.data.cachedNearbyBirdCount;
        if (shouldUpdateAI) {
            nearbyBirdCount = this.countNearbyBirds(x, y, grid, 5);
            cell.data.cachedNearbyBirdCount = nearbyBirdCount;
        }

        // OVERPOPULATION CONTROL
        const isStressed = nearbyBirdCount > 4; // More than 4 nearby = stressed
        const isStarving = cell.data.hunger >= 70; // Very hungry = can't reproduce

        // PRIORITY 0: PERCHING BEHAVIOR
        if (cell.data.isPerching) {
            cell.data.perchTimer++;

            // Rest for 5-10 seconds, then take off
            const restDuration = 300 + Math.floor(Math.random() * 300); // 5-10 seconds
            if (cell.data.perchTimer > restDuration) {
                cell.data.isPerching = false;
                cell.data.perchTimer = 0;
            } else {
                // While perching, just stay still (maybe small movements)
                if (Math.random() > 0.98) {
                    // Occasionally hop to adjacent spot
                    const dir = Math.random() > 0.5 ? 1 : -1;
                    const newX = x + dir;
                    if (this.canPerchAt(newX, y, grid)) {
                        grid.swap(x, y, newX, y);
                        return true;
                    }
                }
                return false; // Stay perched
            }
        }

        // PRIORITY 1: FOOD SEEKING (when hungry AND not on cooldown)
        if (cell.data.hunger > 50 && cell.data.feedingCooldown === 0) {
            // PERFORMANCE: Cache food location lookup
            let foodLocation = cell.data.cachedFoodLocation;
            if (shouldUpdateAI) {
                foodLocation = this.findNearbyFood(x, y, grid);
                cell.data.cachedFoodLocation = foodLocation;
            }

            if (foodLocation) {
                const [foodX, foodY] = foodLocation;

                // Start feeding timer when first approaching food
                if (cell.data.feedingStartTime === null) {
                    cell.data.feedingStartTime = cell.data.age;
                }

                // Check if food is adjacent (can eat it)
                if (Math.abs(foodX - x) <= 1 && Math.abs(foodY - y) <= 1) {
                    // Eat the food
                    const foodElement = grid.getElement(foodX, foodY);

                    if (foodElement && (foodElement.name === 'leaf' || foodElement.name === 'ash' || foodElement.name === 'tree_seed')) {
                        grid.setElement(foodX, foodY, grid.registry.get('empty'));
                        cell.data.hunger = Math.max(0, cell.data.hunger - 70); // Reduce hunger
                        cell.data.seekingFood = false;
                        cell.data.cachedFoodLocation = null;

                        // REPRODUCTION: Similar to fish
                        const canReproduce =
                            cell.data.hunger < 20 &&  // Very well-fed
                            !isStressed &&             // Not stressed from crowding
                            !isStarving &&             // Not starving
                            nearbyBirdCount < 3;       // Maximum 2 nearby birds

                        if (canReproduce) {
                            if (Math.random() < 0.05) { // 5% chance to lay egg
                                this.layEgg(x, y, grid);
                            }
                        }
                        return true;
                    }
                } else {
                    // Food is not adjacent - fly toward it
                    cell.data.seekingFood = true;
                    if (this.flyToward(x, y, foodX, foodY, grid)) {
                        return true;
                    }
                }
            } else {
                // No food found - reset feeding timer
                cell.data.feedingStartTime = null;
                cell.data.seekingFood = false;
            }
        } else {
            cell.data.seekingFood = false;
        }

        // PRIORITY 2: TREE-SITTING BEHAVIOR
        // When not seeking food and occasionally, look for trees to perch on
        if (!cell.data.seekingFood && !cell.data.isPerching) {
            // Randomly decide to find a tree to perch (5% chance per update)
            if (Math.random() > 0.95 && shouldUpdateAI) {
                let treeLocation = cell.data.cachedTreeLocation;
                if (shouldUpdateAI) {
                    treeLocation = this.findNearbyTree(x, y, grid);
                    cell.data.cachedTreeLocation = treeLocation;
                }

                if (treeLocation) {
                    const [treeX, treeY] = treeLocation;

                    // Check if we're on top of a tree (can perch)
                    if (Math.abs(treeX - x) <= 1 && treeY === y - 1) {
                        // Land on tree!
                        cell.data.isPerching = true;
                        cell.data.perchTimer = 0;
                        cell.data.cachedTreeLocation = null;
                        return false;
                    } else {
                        // Fly toward tree
                        if (this.flyToward(x, y, treeX, treeY - 1, grid)) {
                            return true;
                        }
                    }
                }
            }
        }

        // PRIORITY 3: FLYING BEHAVIOR (smooth gliding with bobbing)
        cell.data.flyTimer++;
        cell.data.glidePhase += 0.05; // Increment phase for smooth sine wave

        // Update target altitude occasionally
        if (shouldUpdateAI && Math.random() > 0.98) {
            // Prefer mid-to-upper air (10-40 pixels from top)
            cell.data.altitude = 10 + Math.floor(Math.random() * 30);
        }

        // Change direction occasionally
        if (cell.data.flyTimer > 60 && Math.random() > 0.97) {
            cell.data.flyDirection *= -1;
            cell.data.flyTimer = 0;
        }

        // FLYING MOVEMENT (70% chance to move, smoother than fish)
        if (Math.random() > 0.3) {
            // Vertical movement - smooth bobbing with tendency toward target altitude
            const bobbing = Math.sin(cell.data.glidePhase) * 0.5; // Sine wave bobbing
            const altitudeDiff = cell.data.altitude - y;
            let verticalBias = 0.5; // Default 50/50

            // Bias toward target altitude
            if (altitudeDiff < -5) {
                verticalBias = 0.7; // Go down
            } else if (altitudeDiff > 5) {
                verticalBias = 0.3; // Go up
            }

            // Add bobbing influence
            if (bobbing > 0.2) verticalBias -= 0.2; // Slight upward bob
            if (bobbing < -0.2) verticalBias += 0.2; // Slight downward bob

            // 50% chance for vertical movement
            if (Math.random() > 0.5) {
                const verticalDir = Math.random() < verticalBias ? 1 : -1;
                const newY = y + verticalDir;
                const element = grid.getElement(x, newY);

                // Birds can fly in empty space - avoid lava and fire
                if (element && element.name === 'empty' && !this.isDangerousNearby(x, newY, grid)) {
                    grid.swap(x, y, x, newY);
                    return true;
                }
            }

            // Horizontal gliding (primary movement) - 80% chance
            if (Math.random() > 0.2) {
                const dir = cell.data.flyDirection;
                const newX = x + dir;
                const element = grid.getElement(newX, y);

                if (element && element.name === 'empty' && !this.isDangerousNearby(newX, y, grid)) {
                    grid.swap(x, y, newX, y);
                    return true;
                }

                // If blocked, try diagonal
                const verticalDir = Math.random() > 0.5 ? 1 : -1;
                const diagonalElement = grid.getElement(newX, y + verticalDir);
                if (diagonalElement && diagonalElement.name === 'empty' && !this.isDangerousNearby(newX, y + verticalDir, grid)) {
                    grid.swap(x, y, newX, y + verticalDir);
                    return true;
                }
            }
        }

        return false;
    }

    // Count nearby birds for population control
    countNearbyBirds(x, y, grid, radius) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'bird') {
                    count++;
                }
            }
        }
        return count;
    }

    // Find nearby food (same as fish)
    findNearbyFood(x, y, grid) {
        const searchRadius = 15; // Larger than fish (birds have better vision)

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && (element.name === 'leaf' || element.name === 'ash' || element.name === 'tree_seed')) {
                    return [x + dx, y + dy];
                }
            }
        }

        return null;
    }

    // Find nearby tree to perch on
    findNearbyTree(x, y, grid) {
        const searchRadius = 12;

        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                // Look for tree trunks or branches
                if (element && (element.name === 'tree_trunk' || element.name === 'tree_branch')) {
                    // Check if there's empty space above (can perch on top)
                    const aboveElement = grid.getElement(x + dx, y + dy - 1);
                    if (aboveElement && aboveElement.name === 'empty') {
                        return [x + dx, y + dy];
                    }
                }
            }
        }

        return null;
    }

    // Check if there's dangerous elements (lava, fire) nearby
    isDangerousNearby(x, y, grid) {
        // Check adjacent cells for lava or fire
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && (element.name === 'lava' || element.name === 'fire')) {
                    return true;
                }
            }
        }
        return false;
    }

    // Fly toward a target position
    flyToward(x, y, targetX, targetY, grid) {
        const dx = targetX - x;
        const dy = targetY - y;

        // Move vertically (90% chance when seeking)
        if (Math.abs(dy) > 0 && Math.random() > 0.1) {
            const vertDir = dy > 0 ? 1 : -1;
            const element = grid.getElement(x, y + vertDir);
            if (element && element.name === 'empty' && !this.isDangerousNearby(x, y + vertDir, grid)) {
                grid.swap(x, y, x, y + vertDir);
                return true;
            }
        }

        // Move horizontally (90% chance when seeking)
        if (Math.abs(dx) > 0 && Math.random() > 0.1) {
            const horizDir = dx > 0 ? 1 : -1;
            const element = grid.getElement(x + horizDir, y);
            if (element && element.name === 'empty' && !this.isDangerousNearby(x + horizDir, y, grid)) {
                grid.swap(x, y, x + horizDir, y);
                return true;
            }
        }

        // Try diagonal movement
        if (Math.abs(dx) > 0 && Math.abs(dy) > 0) {
            const horizDir = dx > 0 ? 1 : -1;
            const vertDir = dy > 0 ? 1 : -1;
            const element = grid.getElement(x + horizDir, y + vertDir);
            if (element && element.name === 'empty' && !this.isDangerousNearby(x + horizDir, y + vertDir, grid)) {
                grid.swap(x, y, x + horizDir, y + vertDir);
                return true;
            }
        }

        return false;
    }

    // Lay an egg on a suitable surface (tree branch or ground)
    layEgg(x, y, grid) {
        const spawnOffsets = [
            [0, 1], [0, 2],         // Prefer laying below
            [-1, 1], [1, 1],
            [-1, 0], [1, 0],
            [-1, -1], [1, -1]
        ];

        // Shuffle spawn positions
        spawnOffsets.sort(() => Math.random() - 0.5);

        for (const [dx, dy] of spawnOffsets) {
            const spawnX = x + dx;
            const spawnY = y + dy;
            const element = grid.getElement(spawnX, spawnY);

            // Lay egg in empty space (it will fall to ground or branch)
            if (element && element.name === 'empty') {
                grid.setElement(spawnX, spawnY, grid.registry.get('bird_egg'));
                return true;
            }
        }

        return false;
    }

    // Check if bird can perch at this location (solid surface below)
    canPerchAt(x, y, grid) {
        const below = grid.getElement(x, y + 1);
        if (!below) return false;

        // Can perch on trees or solid surfaces
        const perchableSurfaces = ['tree_trunk', 'tree_branch', 'wood', 'stone', 'wall', 'sand', 'wet_sand'];
        return perchableSurfaces.includes(below.name);
    }
}

export default BirdElement;
