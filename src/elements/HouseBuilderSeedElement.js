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

        // Initialize state
        if (!cell.data.initiated) {
            cell.data.initiated = true;
            cell.data.settled = false;
            cell.data.wanderAttempts = 0;
            cell.data.maxWanderAttempts = 100; // Increased to 100 attempts
            cell.data.wanderDirection = Math.random() > 0.5 ? 1 : -1;
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

                    if (cell.data.wanderAttempts >= cell.data.maxWanderAttempts) {
                        // Give up after too many attempts - turn to ash
                        grid.setElement(x, y, grid.registry.get('ash'));
                        return true;
                    }

                    // Reset to wander mode
                    cell.data.settled = false;
                    cell.data.buildDelay = undefined;

                    // Try SMART MOVEMENT to find better spot
                    const wanderDir = cell.data.wanderDirection;
                    const beside = grid.getElement(x + wanderDir, y);
                    const besideBelow = grid.getElement(x + wanderDir, y + 1);
                    const besideAbove = grid.getElement(x + wanderDir, y - 1);

                    // 1. Try simple sideways move
                    if (beside && beside.id === 0 && besideBelow && besideBelow.id !== 0) {
                        grid.swap(x, y, x + wanderDir, y);
                        return true;
                    }

                    // 2. Try CLIMBING over 1-block obstacle
                    if (beside && beside.id !== 0 && besideAbove && besideAbove.id === 0) {
                        const climbTarget = grid.getElement(x + wanderDir, y - 1);
                        if (climbTarget && climbTarget.id === 0) {
                            grid.swap(x, y, x + wanderDir, y - 1);
                            return true;
                        }
                    }

                    // 3. Try BURROWING through soft materials (sand, ash, leaves, powder)
                    if (beside && beside.state === STATE.POWDER) {
                        grid.setElement(x + wanderDir, y, grid.registry.get('empty'));
                        grid.swap(x, y, x + wanderDir, y);
                        return true;
                    }
                    if (beside && (beside.name === 'ash' || beside.name === 'leaf')) {
                        grid.setElement(x + wanderDir, y, grid.registry.get('empty'));
                        grid.swap(x, y, x + wanderDir, y);
                        return true;
                    }

                    // 4. If all else fails, reverse direction
                    cell.data.wanderDirection *= -1;
                    return false;
                }
            }
        }

        return false;
    }

    isGoodBuildingSpot(x, y, grid) {
        // WATER CHECKS: Don't build underwater (only check building footprint)
        // Check 5-wide, 10-high area directly where house will be
        for (let dy = -1; dy < 10; dy++) { // Check from 1 below to 10 above
            for (let dx = -2; dx <= 2; dx++) { // Only 5-wide (house footprint)
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'water') {
                    return false;
                }
            }
        }

        // TREE CHECKS: Don't build if trees are in the immediate building area
        // Only check 5x10 footprint where house will be built
        const treeElements = ['tree_trunk', 'tree_branch', 'leaf'];
        for (let dy = -1; dy < 10; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const element = grid.getElement(x + dx, y + dy);
                if (element && treeElements.includes(element.name)) {
                    return false;
                }
            }
        }

        // Check if we have SOME solid ground below (at least 3 of 5 positions)
        // Ground doesn't need to be perfect - ground_fill phase will level it
        let solidGroundCount = 0;
        for (let dx = -2; dx <= 2; dx++) {
            const testBelow = grid.getElement(x + dx, y + 1);
            if (testBelow && (testBelow.state === STATE.SOLID || testBelow.state === STATE.POWDER)) {
                solidGroundCount++;
            }
        }
        if (solidGroundCount < 3) {
            return false;
        }

        // Check vertical clearance - make sure there's SOME space to build (at least 5 blocks up)
        let hasVerticalSpace = true;
        for (let dy = 1; dy <= 5; dy++) { // Only check 5 blocks instead of 10
            const above = grid.getElement(x, y - dy);
            if (above && above.id !== 0 && above.state === STATE.SOLID) {
                // Solid obstacle directly above - can't build
                hasVerticalSpace = false;
                break;
            }
        }
        if (!hasVerticalSpace) {
            return false;
        }

        return true; // Good spot!
    }

    handleBuilding(cell, x, y, grid) {
        // Place a STONE marker at foundation level to hold construction data
        // This prevents the construction data from being attached to movable sand/powder
        const foundationY = y + 1;

        // Check if foundation position is in bounds
        if (!grid.isInBounds(x, foundationY)) {
            return false;
        }

        const foundationBelow = grid.getElement(x, foundationY);
        if (!foundationBelow) {
            return false;
        }

        // Replace whatever is below with a stone foundation marker
        const stoneElement = grid.registry.get('stone');
        if (!stoneElement) {
            return false;
        }

        grid.setElement(x, foundationY, stoneElement);

        // Now get the new stone cell and attach construction data to it
        const foundationCell = grid.getCell(x, foundationY);
        if (!foundationCell) {
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

        // PERFORMANCE: Register construction for efficient updates
        grid.registerConstruction(x, foundationY);

        // Builder disappears (job done! they started the construction)
        grid.setElement(x, y, grid.registry.get('empty'));

        return true;
    }
}

export default HouseBuilderSeedElement;