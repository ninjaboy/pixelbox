import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x666666, {
            density: 6,
            state: STATE.SOLID,
            movable: true,
            tags: [],
            brushSize: 3, // Medium brush for building
            emissionDensity: 1.0 // Solid placement
        });

        // Track which boulders have already been processed this frame
        this.processedBoulders = new Set();
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if this stone is part of a boulder
        const boulderId = cell.data.boulderId;

        if (boulderId !== undefined) {
            // This is part of a boulder - use boulder physics
            return this.updateBoulder(x, y, grid, boulderId);
        } else {
            // This is a standalone stone (e.g., from border creation)
            // Use old individual physics
            return this.updateIndividual(x, y, grid);
        }
    }

    updateBoulder(x, y, grid, boulderId) {
        // Only process each boulder once per frame
        if (this.processedBoulders.has(boulderId)) {
            return false;
        }

        // Mark this boulder as processed
        this.processedBoulders.add(boulderId);

        // Check if entire boulder can fall
        if (grid.canBoulderMoveDown(boulderId)) {
            grid.moveBoulderDown(boulderId);
            return true;
        }

        // Boulder is resting - no diagonal sliding for boulders
        return false;
    }

    updateIndividual(x, y, grid) {
        // Individual stone physics (for borders, etc.)
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        const dir = Math.random() > 0.5 ? -1 : 1;

        // Rarely slide diagonally
        if (Math.random() > 0.98) {
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
            if (grid.canMoveTo(x, y, x - dir, y + 1)) {
                grid.swap(x, y, x - dir, y + 1);
                return true;
            }
        }

        return false;
    }
}

export default StoneElement;
