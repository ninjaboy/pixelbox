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

        // Get time of day for day/night behavior
        const time = grid.dayNightCycle ? grid.dayNightCycle.getTime() : 0.5;
        const isNight = time >= 0.85 || time < 0.2; // Night time: 0.85-0.2
        const isMorning = time >= 0.2 && time < 0.3; // Morning: 0.2-0.3

        // Initialize bird data on first update (spawn)
        if (!cell.data.flyDirection) {
            cell.data.flyDirection = Math.random() > 0.5 ? 1 : -1;
            cell.data.flyTimer = 0;
            cell.data.hunger = 0; // Hunger level (0-100, higher = hungrier)
            cell.data.age = 0;
            cell.data.feedingCooldown = 0; // Frames until can eat again
            cell.data.perchTimer = 0; // Time spent perching
            cell.data.isPerching = false;
            cell.data.isSleeping = false; // Sleeping at night
            cell.data.altitude = y; // Target altitude for flying
            cell.data.glidePhase = 0; // For smooth bobbing motion

            // PERFORMANCE: Cache expensive lookups
            cell.data.cachedTreeLocation = null;
            cell.data.cachedNearbyBirdCount = 0;
            cell.data.cacheFrame = 0;

            // Randomize color on spawn
            const randomColor = this.colorVariants[Math.floor(Math.random() * this.colorVariants.length)];
            cell.data.birdColor = randomColor;
        }

        // Age tracking
        cell.data.age++;

        // PERFORMANCE: Update bird AI every 5 frames (reduces CPU by 80%)
        const shouldUpdateAI = (grid.frameCount + (x + y) % 5) % 5 === 0;

        // FEEDING COOLDOWN SYSTEM
        if (cell.data.feedingCooldown > 0) {
            cell.data.feedingCooldown--;
        }

        // HUNGER SYSTEM
        cell.data.hunger = Math.min(100, cell.data.hunger + 0.015); // Same rate as fish

        // PERFORMANCE: Cache nearby bird count and flock data
        let nearbyBirdCount = cell.data.cachedNearbyBirdCount;
        let flockData = cell.data.cachedFlockData;
        if (shouldUpdateAI) {
            const flockInfo = this.analyzeNearbyFlock(x, y, grid, 7); // Check 7x7 area for flocking
            nearbyBirdCount = flockInfo.count;
            flockData = flockInfo;
            cell.data.cachedNearbyBirdCount = nearbyBirdCount;
            cell.data.cachedFlockData = flockData;
        }

        // OVERPOPULATION CONTROL
        const isStressed = nearbyBirdCount > 4; // More than 4 nearby = stressed
        const isStarving = cell.data.hunger >= 70; // Very hungry = can't reproduce

        // Get season data (v4.0.0)
        const seasonData = grid.seasonData;
        const season = seasonData ? seasonData.season : 'summer';
        const seasonProgress = seasonData ? seasonData.seasonProgress : 0;

        // PRIORITY -1: MIGRATION (v4.0.0) - Birds migrate south in flocks for winter
        if (seasonData) {
            // Autumn migration - start migrating in late autumn
            if (season === 'autumn' && seasonProgress > 0.5) {
                cell.data.migrating = true;
            }

            // Migrating birds fly SOUTH (down and right) in coordinated flocks
            if (cell.data.migrating) {
                // Use flock data to stay in formation during migration
                let moveX = 1; // Default: fly right (east/south)
                let moveY = 1; // Default: fly down (south)

                // If in a flock, align with flock's average direction
                if (flockData && flockData.count > 1) {
                    // Add slight cohesion - move toward flock center
                    if (flockData.centerX > x) moveX = 1;
                    else if (flockData.centerX < x) moveX = -1;
                    else moveX = Math.random() > 0.5 ? 1 : -1;

                    // Keep moving south (downward)
                    moveY = 1;

                    // Maintain spacing - if too close to flock center, spread out
                    const distToCenter = Math.abs(flockData.centerX - x) + Math.abs(flockData.centerY - y);
                    if (distToCenter < 2) {
                        // Too close, move away slightly
                        moveX = flockData.centerX > x ? -1 : 1;
                    }
                }

                // Try diagonal south-east movement (V-formation migration)
                if (grid.isEmpty(x + moveX, y + moveY) && !this.isDangerousNearby(x + moveX, y + moveY, grid)) {
                    grid.swap(x, y, x + moveX, y + moveY);
                    return true;
                }

                // If blocked diagonally, try just moving south (down)
                if (grid.isEmpty(x, y + moveY)) {
                    grid.swap(x, y, x, y + moveY);
                    return true;
                }

                // Try just moving east (right)
                if (grid.isEmpty(x + moveX, y)) {
                    grid.swap(x, y, x + moveX, y);
                    return true;
                }

                // If at bottom or right edge of map, despawn (migrated south)
                if (y > grid.height - 10 || x > grid.width - 10) {
                    grid.setElement(x, y, grid.registry.get('empty'));
                    return true;
                }

                return false; // Keep trying to migrate
            }

            // Winter - no birds (they've all migrated)
            // Spring - birds return (handled in main.js by spawning)
        }

        // PRIORITY 0: NIGHT TIME - Birds sleep when it's dark!
        if (isNight && !cell.data.isSleeping) {
            // Find a perch to sleep on (tree, ground, roof, etc.)
            if (this.canPerchAt(x, y, grid)) {
                // Found a spot, go to sleep!
                cell.data.isSleeping = true;
                cell.data.isPerching = true;
                return false;
            } else {
                // Look for nearby perch spot
                const perchSpot = this.findNearbyPerchSpot(x, y, grid);
                if (perchSpot) {
                    const [perchX, perchY] = perchSpot;
                    if (this.flyToward(x, y, perchX, perchY, grid)) {
                        return true;
                    }
                } else {
                    // Can't find perch, descend slowly
                    const below = grid.getElement(x, y + 1);
                    if (below && below.name === 'empty') {
                        grid.swap(x, y, x, y + 1);
                        return true;
                    }
                }
            }
        }

        // Wake up in the morning!
        if (isMorning && cell.data.isSleeping) {
            cell.data.isSleeping = false;
            cell.data.isPerching = false;
            cell.data.perchTimer = 0;
            // Don't return - bird will start flying again
        }

        // PRIORITY 1: SLEEPING BEHAVIOR - Stay still when sleeping
        if (cell.data.isSleeping) {
            // Just stay still and sleep
            return false;
        }

        // PRIORITY 2: PERCHING BEHAVIOR
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

        // PRIORITY 1: ESCAPE MODE - Detect enclosed spaces and escape!
        const isTrapped = this.isEnclosed(x, y, grid);
        if (isTrapped) {
            // Panic! Fly upward aggressively to escape
            const escapeDir = -1; // Always go up when trapped
            const newY = y + escapeDir;
            const element = grid.getElement(x, newY);

            if (element && element.name === 'empty') {
                grid.swap(x, y, x, newY);
                return true;
            }

            // Try diagonal up-left or up-right
            const horizDir = Math.random() > 0.5 ? 1 : -1;
            const diagElement = grid.getElement(x + horizDir, newY);
            if (diagElement && diagElement.name === 'empty') {
                grid.swap(x, y, x + horizDir, newY);
                return true;
            }
        }

        // PRIORITY 2: FEEDING - Simplified! Birds feed when touching any solid surface
        if (cell.data.hunger > 50 && cell.data.feedingCooldown === 0) {
            // Check if touching any solid surface below or adjacent
            const solidBelow = this.checkAdjacentSolid(x, y, grid);

            if (solidBelow) {
                // Feed on any solid surface!
                cell.data.hunger = Math.max(0, cell.data.hunger - 50); // Reduce hunger
                cell.data.feedingCooldown = 600; // 10 second cooldown

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
                return false; // Stay in place while feeding
            }
        }

        // PRIORITY 3: TREE-SITTING BEHAVIOR (occasional, when not trapped)
        // Randomly decide to find a tree to perch (2% chance = less frequent)
        if (!isTrapped && !cell.data.isPerching && Math.random() > 0.98 && shouldUpdateAI) {
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

        // PRIORITY 4: FLYING BEHAVIOR (smooth gliding with flocking)
        cell.data.flyTimer++;
        cell.data.glidePhase += 0.05; // Increment phase for smooth sine wave

        // Update target altitude occasionally - fly BELOW the clouds
        if (shouldUpdateAI && Math.random() > 0.98) {
            // Clouds are at 0-40% of grid height
            // Birds should fly at 40-70% of grid height (below clouds, above ground)
            const cloudLayer = Math.floor(grid.height * 0.4);
            const midGround = Math.floor(grid.height * 0.7);
            cell.data.altitude = cloudLayer + Math.floor(Math.random() * (midGround - cloudLayer));
        }

        // FLOCKING BEHAVIOR - Apply boids algorithm when near other birds
        let flockInfluence = { x: 0, y: 0 };
        const isFlocking = flockData && flockData.count > 1;

        if (isFlocking) {
            // COHESION: Move toward flock center (weak influence)
            const cohesionX = (flockData.centerX - x) * 0.15;
            const cohesionY = (flockData.centerY - y) * 0.15;

            // SEPARATION: Avoid getting too close (strong influence)
            const separationX = flockData.separationX * 0.4;
            const separationY = flockData.separationY * 0.4;

            // ALIGNMENT: Match flock's average direction (medium influence)
            const alignmentX = flockData.avgDirectionX * 0.25;
            const alignmentY = 0; // Keep altitude control separate

            // Combine influences
            flockInfluence.x = cohesionX + separationX + alignmentX;
            flockInfluence.y = cohesionY + separationY;

            // Align direction with flock
            if (Math.abs(flockData.avgDirectionX) > 0.5) {
                cell.data.flyDirection = flockData.avgDirectionX > 0 ? 1 : -1;
            }
        } else {
            // Change direction occasionally when not flocking
            if (cell.data.flyTimer > 60 && Math.random() > 0.97) {
                cell.data.flyDirection *= -1;
                cell.data.flyTimer = 0;
            }
        }

        // FLYING MOVEMENT (70% chance to move, smoother than fish)
        if (Math.random() > 0.3) {
            // Vertical movement - smooth bobbing with STRONG upward bias + flock influence
            const bobbing = Math.sin(cell.data.glidePhase) * 0.5; // Sine wave bobbing
            const altitudeDiff = cell.data.altitude - y;
            let verticalBias = 0.25; // Default bias toward going UP (25% down, 75% up)

            // Strong bias toward target altitude
            if (altitudeDiff < -5) {
                verticalBias = 0.1; // Very strong upward - bird is too low!
            } else if (altitudeDiff > 5) {
                verticalBias = 0.7; // Strong downward - bird is too high!
            }

            // Add bobbing influence
            if (bobbing > 0.2) verticalBias -= 0.1; // Upward bob
            if (bobbing < -0.2) verticalBias += 0.1; // Downward bob

            // Add flock influence to vertical movement
            if (isFlocking && Math.abs(flockInfluence.y) > 0.3) {
                verticalBias += flockInfluence.y > 0 ? 0.15 : -0.15;
            }

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

            // Horizontal gliding (primary movement) - 80% chance + flock influence
            if (Math.random() > 0.2) {
                let dir = cell.data.flyDirection;

                // Apply flock influence to horizontal direction
                if (isFlocking && Math.abs(flockInfluence.x) > 0.5) {
                    dir = flockInfluence.x > 0 ? 1 : -1;
                }

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

    // Analyze nearby birds for flocking behavior (boids algorithm)
    analyzeNearbyFlock(x, y, grid, radius) {
        let count = 0;
        let sumX = 0, sumY = 0;
        let sumDirectionX = 0;
        let separationX = 0, separationY = 0;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'bird') {
                    const birdCell = grid.getCell(x + dx, y + dy);
                    if (birdCell && birdCell.data) {
                        count++;

                        // Cohesion: accumulate positions for center calculation
                        sumX += x + dx;
                        sumY += y + dy;

                        // Alignment: accumulate directions
                        sumDirectionX += birdCell.data.flyDirection || 0;

                        // Separation: push away from very close birds
                        const dist = Math.abs(dx) + Math.abs(dy);
                        if (dist < 3) { // Within 3 pixels = too close
                            separationX -= dx; // Push away (negative of displacement)
                            separationY -= dy;
                        }
                    }
                }
            }
        }

        if (count === 0) {
            return { count: 0 };
        }

        // Calculate averages
        const centerX = sumX / count;
        const centerY = sumY / count;
        const avgDirectionX = sumDirectionX / count;

        return {
            count,
            centerX,
            centerY,
            avgDirectionX,
            separationX,
            separationY
        };
    }

    // Find nearby tree to perch on
    findNearbyTree(x, y, grid) {
        const searchRadius = 7; // PERFORMANCE: Reduced from 12 to 7 for faster scanning

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

    // Detect if bird is enclosed/trapped (too many solid blocks nearby)
    isEnclosed(x, y, grid) {
        let solidCount = 0;
        const checkRadius = 2;

        // Count solid blocks in 5x5 area around bird
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip bird's own position

                const element = grid.getElement(x + dx, y + dy);
                // Count non-empty, non-dangerous elements as "solid"
                if (element && element.name !== 'empty' &&
                    element.name !== 'lava' && element.name !== 'fire' &&
                    element.name !== 'bird' && element.name !== 'fish') {
                    solidCount++;
                }
            }
        }

        // If more than 16 solid blocks out of 24 cells, bird is trapped
        return solidCount > 16;
    }

    // Check if bird is touching any solid surface (for feeding)
    checkAdjacentSolid(x, y, grid) {
        // Check all 8 adjacent cells
        const offsets = [
            [0, 1], [0, -1], [1, 0], [-1, 0],  // Cardinals
            [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonals
        ];

        for (const [dx, dy] of offsets) {
            const element = grid.getElement(x + dx, y + dy);
            // Any solid (non-empty, non-dangerous) surface counts
            if (element && element.name !== 'empty' &&
                element.name !== 'lava' && element.name !== 'fire' &&
                element.name !== 'water' && element.name !== 'acid' &&
                element.name !== 'bird' && element.name !== 'fish') {
                return true;
            }
        }

        return false;
    }

    // Find nearby perch spot for sleeping at night
    findNearbyPerchSpot(x, y, grid) {
        const searchRadius = 10;

        for (let dy = searchRadius; dy >= -searchRadius; dy--) { // Search from bottom up
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const checkY = y + dy;
                const checkX = x + dx;
                const element = grid.getElement(checkX, checkY);

                // Look for empty space with solid below (perchable spot)
                if (element && element.name === 'empty') {
                    const below = grid.getElement(checkX, checkY + 1);
                    if (below && below.name !== 'empty' &&
                        below.name !== 'lava' && below.name !== 'fire' &&
                        below.name !== 'water' && below.name !== 'acid') {
                        return [checkX, checkY];
                    }
                }
            }
        }

        return null;
    }
}

export default BirdElement;
