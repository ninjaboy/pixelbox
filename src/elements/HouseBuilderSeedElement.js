import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

/**
 * HouseBuilderSeedElement - Wandering builder that finds a spot and builds a house
 * Behavior: Falls → Wanders → Finds good spot → Builds house → Disappears
 */
class HouseBuilderSeedElement extends Element {
    constructor() {
        super(41, 'house_seed', 0xFFD700, { // Gold color (visible builder)
            density: 5, // Medium density - can fall through liquids but not powders
            state: STATE.POWDER, // Falls like powder
            tags: [],
            brushSize: 1,
            emissionDensity: 0.1
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize state
        if (!cell.data.mode) {
            cell.data.mode = 'falling'; // falling → wandering → building
            cell.data.wanderTimer = 0;
            cell.data.wanderDirection = Math.random() > 0.5 ? 1 : -1;
            cell.data.buildTimer = 0;
            console.log('🏠 House builder initialized at', x, y);
        }

        // Handle different modes
        switch (cell.data.mode) {
            case 'falling':
                return this.handleFalling(cell, x, y, grid);
            case 'wandering':
                return this.handleWandering(cell, x, y, grid);
            case 'building':
                return this.handleBuilding(cell, x, y, grid);
            default:
                return false;
        }
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

        // Builder disappears and creates invisible construction marker
        grid.setElement(x, y, grid.registry.get('empty'));

        // Create construction marker at foundation level
        const foundationY = y + 1;
        const foundationCell = grid.getCell(x, foundationY);
        if (foundationCell && foundationCell.element) {
            foundationCell.data._houseConstruction = {
                centerX: x,
                baseY: foundationY,
                buildPhase: 'foundation',
                buildStep: 0,
                buildTimer: 0
            };
            console.log('🏠 Construction marker created at foundation', x, foundationY);
        } else {
            console.error('🏠 Failed to create construction marker - no foundation cell');
        }

        return true;
    }
}

export default HouseBuilderSeedElement;