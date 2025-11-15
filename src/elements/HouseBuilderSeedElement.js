import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

/**
 * HouseBuilderSeedElement - Wandering builder that finds a spot and builds a house
 * Behavior: Falls → Wanders → Finds good spot → Builds house → Disappears
 */
class HouseBuilderSeedElement extends Element {
    constructor() {
        super(41, 'house_seed', 0xFFD700, { // Gold color (visible builder)
            density: 5, // Medium density
            state: STATE.SOLID, // SOLID so it doesn't get pushed around by sand/powders
            tags: [TAG.COMBUSTIBLE], // Burnable and destructible
            ignitionResistance: 0.5, // Fairly flammable (50% resistance)
            burnsInto: 'ash', // Burns into ash when destroyed
            brushSize: 1,
            emissionDensity: 0.1
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if construction is already in progress
        if (cell.data._houseConstruction) {
            // Builder has started construction, just stay still
            // Construction manager will handle building
            return false;
        }

        // Initialize state
        if (!cell.data.initiated) {
            cell.data.initiated = true;
            cell.data.settled = false;
            cell.data.wanderAttempts = 0;
            cell.data.maxWanderAttempts = 50; // Try 50 times to find good spot
            cell.data.wanderDirection = Math.random() > 0.5 ? 1 : -1;
            console.log('🏠 House builder placed at', x, y);
        }

        // GRAVITY: Try to fall even though we're SOLID
        const below = grid.getElement(x, y + 1);

        // Fall through empty space and liquids
        if (below && (below.id === 0 || below.state === 'liquid')) {
            grid.swap(x, y, x, y + 1);
            cell.data.settled = false;
            return true;
        }

        // Try diagonal fall if can't fall straight down
        if (below && below.id !== 0 && below.state !== 'liquid') {
            const dir = Math.random() > 0.5 ? 1 : -1;
            const diagBelow = grid.getElement(x + dir, y + 1);
            const diag = grid.getElement(x + dir, y);

            if (diagBelow && diag &&
                (diagBelow.id === 0 || diagBelow.state === 'liquid') &&
                (diag.id === 0 || diag.state === 'liquid')) {
                grid.swap(x, y, x + dir, y + 1);
                cell.data.settled = false;
                return true;
            }
        }

        // Landed on solid ground - mark as settled and validate spot
        if (!cell.data.settled && below && (below.state === STATE.SOLID || below.state === STATE.POWDER)) {
            cell.data.settled = true;
            cell.data.buildDelay = 5; // Short delay to make sure we're stable
            console.log('🏠 Builder landed at', x, y);
            return false;
        }

        // Wait for build delay, then validate spot
        if (cell.data.settled && cell.data.buildDelay !== undefined) {
            if (cell.data.buildDelay > 0) {
                cell.data.buildDelay--;
                return false;
            } else {
                // VALIDATE SPOT before building
                if (this.isGoodBuildingSpot(x, y, grid)) {
                    // Good spot - start building!
                    return this.handleBuilding(cell, x, y, grid);
                } else {
                    // Bad spot - wander to find better location
                    cell.data.wanderAttempts++;
                    console.log('🏠 Bad location, wandering... (attempt', cell.data.wanderAttempts, '/', cell.data.maxWanderAttempts, ')');

                    if (cell.data.wanderAttempts >= cell.data.maxWanderAttempts) {
                        // Give up after too many attempts - turn to ash
                        console.log('🏠 Builder gave up after', cell.data.wanderAttempts, 'attempts');
                        grid.setElement(x, y, grid.registry.get('ash'));
                        return true;
                    }

                    // Reset to wander mode
                    cell.data.settled = false;
                    cell.data.buildDelay = undefined;
                    // Try moving sideways
                    const wanderDir = cell.data.wanderDirection;
                    const beside = grid.getElement(x + wanderDir, y);
                    const besideBelow = grid.getElement(x + wanderDir, y + 1);

                    if (beside && beside.id === 0 && besideBelow && besideBelow.id !== 0) {
                        // Can move sideways
                        grid.swap(x, y, x + wanderDir, y);
                        return true;
                    } else {
                        // Reverse direction if blocked
                        cell.data.wanderDirection *= -1;
                        return false;
                    }
                }
            }
        }

        return false;
    }

    handleFalling(cell, x, y, grid) {
        const below = grid.getElement(x, y + 1);

        // Try to fall straight down
        if (below && (below.id === 0 || below.state === 'liquid')) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Landed on solid ground - start wandering
        if (below && (below.state === STATE.SOLID || below.state === STATE.POWDER)) {
            console.log('🏠 Builder landed, starting to wander at', x, y);
            cell.data.mode = 'wandering';
            cell.data.wanderTimer = 0;
            return false;
        }

        // Try diagonal fall
        const dir = Math.random() > 0.5 ? 1 : -1;
        const diagBelow = grid.getElement(x + dir, y + 1);
        if (diagBelow && (diagBelow.id === 0 || diagBelow.state === 'liquid')) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }

        return false;
    }

    handleWandering(cell, x, y, grid) {
        cell.data.wanderTimer++;

        // Check if we're on solid ground
        const below = grid.getElement(x, y + 1);
        if (!below || below.id === 0 || below.state === 'liquid') {
            // Lost ground - fall again
            cell.data.mode = 'falling';
            return false;
        }

        // Wander for just 10 frames before building (faster)
        if (cell.data.wanderTimer < 10) {
            // Keep wandering
            const dir = cell.data.wanderDirection;
            const beside = grid.getElement(x + dir, y);
            const besideBelow = grid.getElement(x + dir, y + 1);

            // Change direction if hit obstacle or edge
            if (!beside || beside.id !== 0 || !besideBelow || besideBelow.id === 0) {
                cell.data.wanderDirection *= -1;
                return false;
            }

            // Move sideways
            if (Math.random() < 0.5) { // 50% chance to move each frame
                grid.swap(x, y, x + dir, y);
                return true;
            }
            return false;
        }

        // After minimal wandering, just start building!
        // The construction manager will handle ground filling
        console.log('🏠 Starting building at', x, y);
        cell.data.mode = 'building';
        return true;
    }

    isGoodBuildingSpot(x, y, grid) {
        // WATER CHECKS: Don't build underwater or near water
        const buildRadius = 5; // Check 5-block radius for water
        for (let dy = -1; dy < 10; dy++) { // Check from 1 below to 10 above
            for (let dx = -buildRadius; dx <= buildRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'water') {
                    console.log('🏠 Bad spot: Water detected at', x + dx, y + dy);
                    return false; // Water in building area
                }
            }
        }

        // TREE CHECKS: Don't build near trees
        const treeRadius = 8; // Check 8-block radius for trees
        const treeElements = ['tree_trunk', 'tree_branch', 'leaf', 'tree_seed'];
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -treeRadius; dx <= treeRadius; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && treeElements.includes(element.name)) {
                    console.log('🏠 Bad spot: Tree detected at', x + dx, y + dy);
                    return false; // Too close to trees
                }
            }
        }

        // Check if we have solid ground below
        const below = grid.getElement(x, y + 1);
        if (!below || (below.state !== STATE.SOLID && below.state !== STATE.POWDER)) {
            console.log('🏠 Bad spot: No solid ground below');
            return false;
        }

        // Check if we have 5 blocks of horizontal space
        for (let dx = -2; dx <= 2; dx++) {
            const testX = x + dx;
            const above = grid.getElement(testX, y - 1);
            const testBelow = grid.getElement(testX, y + 1);

            // Need clear space above and solid ground below
            if (!above || above.id !== 0) {
                console.log('🏠 Bad spot: Not enough horizontal clearance');
                return false;
            }
            if (!testBelow || (testBelow.state !== STATE.SOLID && testBelow.state !== STATE.POWDER)) {
                console.log('🏠 Bad spot: Uneven ground');
                return false;
            }
        }

        // Check if we have vertical clearance (at least 10 blocks high)
        for (let dy = 0; dy < 10; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const testElement = grid.getElement(x + dx, y - dy);
                if (testElement && testElement.id !== 0) {
                    console.log('🏠 Bad spot: Not enough vertical clearance');
                    return false; // Obstacle in the way
                }
            }
        }

        console.log('🏠 Good spot found at', x, y);
        return true; // Good spot!
    }

    handleBuilding(cell, x, y, grid) {
        console.log('🏠 Starting construction at', x, y);

        // Place a STONE marker at foundation level to hold construction data
        // This prevents the construction data from being attached to movable sand/powder
        const foundationY = y + 1;

        // Check if foundation position is in bounds
        if (!grid.isInBounds(x, foundationY)) {
            console.error('🏠 Cannot build - foundation position out of bounds');
            return false;
        }

        const foundationBelow = grid.getElement(x, foundationY);
        if (!foundationBelow) {
            console.error('🏠 Cannot build - no element at foundation position');
            return false;
        }

        // Replace whatever is below with a stone foundation marker
        const stoneElement = grid.registry.get('stone');
        if (!stoneElement) {
            console.error('🏠 Cannot build - stone element not found in registry');
            return false;
        }

        grid.setElement(x, foundationY, stoneElement);

        // Now get the new stone cell and attach construction data to it
        const foundationCell = grid.getCell(x, foundationY);
        if (!foundationCell) {
            console.error('🏠 Failed to create foundation marker');
            return false;
        }

        // Attach construction data to the stable stone foundation
        foundationCell.data._houseConstruction = {
            centerX: x,
            baseY: foundationY,  // Build foundation at this level
            buildPhase: 'ground_fill',
            buildStep: 0,
            buildTimer: 0
        };

        // Mark builder as having started construction
        cell.data._houseConstruction = true; // Just a marker so builder stays still

        console.log('🏠 Construction marker created on stone foundation at', x, foundationY);
        return true;
    }
}

export default HouseBuilderSeedElement;