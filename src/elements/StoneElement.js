import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x808080, { // Lighter gray for better visibility
            density: 10, // Higher than lava (8) to prevent displacement
            state: STATE.SOLID,
            movable: false, // Stone is immovable - acts as container for lava
            tags: [],
            brushSize: 1, // Single pixel brush
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
        // Stone is rigid - only falls straight down into empty space or liquids
        const below = grid.getCell(x, y + 1);
        if (!below) return false;

        const belowElement = below.element;

        // Can only move into completely empty space
        if (belowElement.id === 0) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Can displace liquids (water, oil, steam) but NOT powders or other solids
        if (belowElement.state === 'liquid' && this.density > belowElement.density) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Stone doesn't slide diagonally or swap with powders/solids
        return false;
    }
}

export default StoneElement;
