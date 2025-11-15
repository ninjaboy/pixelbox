import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

/**
 * HouseBuilderSeedElement - Wandering builder that finds a spot and builds a house
 * Behavior: Falls → Wanders → Finds good spot → Builds house → Disappears
 */
class HouseBuilderSeedElement extends Element {
    constructor() {
        super(41, 'house_seed', 0xFFD700, { // Gold color (visible builder)
            density: 5, // Medium density
            state: STATE.SOLID, // SOLID so it doesn't get pushed around by sand/powders
            tags: [],
            brushSize: 1,
            emissionDensity: 0.1
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize state - start building immediately after 1 frame
        if (!cell.data.initiated) {
            cell.data.initiated = true;
            cell.data.buildDelay = 1; // Just 1 frame delay to let it settle
            console.log('🏠 House builder placed at', x, y);
            return false;
        }

        // Wait for build delay
        if (cell.data.buildDelay > 0) {
            cell.data.buildDelay--;
            return false;
        }

        // Start building immediately!
        return this.handleBuilding(cell, x, y, grid);
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
        // Check if we have solid ground below
        const below = grid.getElement(x, y + 1);
        if (!below || (below.state !== STATE.SOLID && below.state !== STATE.POWDER)) {
            return false;
        }

        // Check if we have 5 blocks of horizontal space
        for (let dx = -2; dx <= 2; dx++) {
            const testX = x + dx;
            const above = grid.getElement(testX, y - 1);
            const testBelow = grid.getElement(testX, y + 1);

            // Need clear space above and solid ground below
            if (!above || above.id !== 0) return false;
            if (!testBelow || (testBelow.state !== STATE.SOLID && testBelow.state !== STATE.POWDER)) return false;
        }

        // Check if we have vertical clearance (at least 10 blocks high)
        for (let dy = 0; dy < 10; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const testElement = grid.getElement(x + dx, y - dy);
                if (testElement && testElement.id !== 0) {
                    return false; // Obstacle in the way
                }
            }
        }

        return true; // Good spot!
    }

    handleBuilding(cell, x, y, grid) {
        console.log('🏠 Starting construction at', x, y);

        // Keep builder in place and attach construction data to THIS cell
        // The construction will eventually build over this spot too
        cell.data._houseConstruction = {
            centerX: x,
            baseY: y,  // Build at this level
            buildPhase: 'ground_fill',
            buildStep: 0,
            buildTimer: 0
        };
        console.log('🏠 Construction marker created - starting ground fill at', x, y);

        return true;
    }
}

export default HouseBuilderSeedElement;