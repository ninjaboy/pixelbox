import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

/**
 * HouseBuilderSeedElement - Autonomously builds a house structure
 * Phases: Foundation → Walls → Floors → Roof → Complete
 */
class HouseBuilderSeedElement extends Element {
    constructor() {
        super(41, 'house_seed', 0x8B4513, { // Saddle brown
            density: 10, // Heavy like stone so it sinks to ground
            state: STATE.SOLID,
            tags: [],
            brushSize: 1,
            emissionDensity: 0.1
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize building state
        if (!cell.data.buildPhase) {
            this.initializeBuild(cell, x, y, grid);
        }

        // Update based on current phase
        switch (cell.data.buildPhase) {
            case 'foundation':
                return this.buildFoundation(cell, x, y, grid);
            case 'floor1':
                return this.buildFloor1(cell, x, y, grid);
            case 'floor2':
                return this.buildFloor2(cell, x, y, grid);
            case 'roof':
                return this.buildRoof(cell, x, y, grid);
            case 'complete':
                return this.onComplete(cell, x, y, grid);
            default:
                return false;
        }
    }

    initializeBuild(cell, x, y, grid) {
        // Find solid ground below
        let groundY = y + 1;
        while (groundY < grid.height) {
            const below = grid.getElement(x, groundY);
            if (below && (below.state === STATE.SOLID || below.state === STATE.POWDER)) {
                break;
            }
            groundY++;
        }

        cell.data.buildPhase = 'foundation';
        cell.data.buildTimer = 0;
        cell.data.foundationY = groundY;
        cell.data.foundationX = x - 2; // Center of 5-wide foundation
        cell.data.houseWidth = 5;
        cell.data.storyHeight = 3;
        cell.data.currentX = x - 2;
        cell.data.currentY = groundY;
        cell.data.buildStep = 0;

        // Change color to indicate building started
        cell.element.color = 0xD2691E; // Chocolate brown
    }

    buildFoundation(cell, x, y, grid) {
        cell.data.buildTimer++;

        // Build foundation blocks one at a time
        const fx = cell.data.foundationX + cell.data.buildStep;
        const fy = cell.data.foundationY;

        if (cell.data.buildStep < cell.data.houseWidth) {
            // Place foundation stone if empty or liquid
            const targetElement = grid.getElement(fx, fy);
            if (targetElement && (targetElement.id === 0 || targetElement.state === 'liquid')) {
                grid.setElement(fx, fy, grid.registry.get('stone'));
            }
            cell.data.buildStep++;
            return true;
        }

        // Foundation complete, move to first floor
        cell.data.buildPhase = 'floor1';
        cell.data.buildStep = 0;
        cell.data.currentY = cell.data.foundationY - 1; // Start building above foundation
        cell.element.color = 0xDEB887; // Burlywood
        return true;
    }

    buildFloor1(cell, x, y, grid) {
        cell.data.buildTimer++;
        const baseX = cell.data.foundationX;
        const baseY = cell.data.currentY;
        const width = cell.data.houseWidth;
        const height = cell.data.storyHeight;

        // Build in sequence: left wall, right wall, then ceiling
        const step = cell.data.buildStep;

        if (step < height) {
            // Build left wall (bottom to top)
            this.placeBlock(baseX, baseY - step, 'wood', grid);
            cell.data.buildStep++;
            return true;
        } else if (step < height * 2) {
            // Build right wall (bottom to top)
            this.placeBlock(baseX + width - 1, baseY - (step - height), 'wood', grid);
            cell.data.buildStep++;
            return true;
        } else if (step < height * 2 + width) {
            // Build ceiling/floor separator (left to right)
            const floorX = baseX + (step - height * 2);
            this.placeBlock(floorX, baseY - height, 'wood', grid);
            cell.data.buildStep++;
            return true;
        } else {
            // Floor 1 complete, move to floor 2
            cell.data.buildPhase = 'floor2';
            cell.data.buildStep = 0;
            cell.data.currentY = baseY - height - 1; // Start above floor 1 ceiling
            cell.element.color = 0xF5DEB3; // Wheat
            return true;
        }
    }

    buildFloor2(cell, x, y, grid) {
        cell.data.buildTimer++;
        const baseX = cell.data.foundationX;
        const baseY = cell.data.currentY;
        const width = cell.data.houseWidth;
        const height = cell.data.storyHeight;

        const step = cell.data.buildStep;

        if (step < height) {
            // Build left wall (bottom to top)
            this.placeBlock(baseX, baseY - step, 'wood', grid);
            cell.data.buildStep++;
            return true;
        } else if (step < height * 2) {
            // Build right wall (bottom to top)
            this.placeBlock(baseX + width - 1, baseY - (step - height), 'wood', grid);
            cell.data.buildStep++;
            return true;
        } else if (step < height * 2 + 1) {
            // Add window in middle of floor 2 left wall
            const windowY = baseY - Math.floor(height / 2);
            this.placeBlock(baseX, windowY, 'glass', grid);
            cell.data.buildStep++;
            return true;
        } else if (step < height * 2 + width) {
            // Build ceiling (left to right)
            const ceilingX = baseX + (step - height * 2 - 1);
            this.placeBlock(ceilingX, baseY - height, 'wood', grid);
            cell.data.buildStep++;
            return true;
        } else {
            // Floor 2 complete, move to roof
            cell.data.buildPhase = 'roof';
            cell.data.buildStep = 0;
            cell.data.roofBaseY = baseY - height - 1;
            cell.element.color = 0x808080; // Gray
            return true;
        }
    }

    buildRoof(cell, x, y, grid) {
        cell.data.buildTimer++;
        const baseX = cell.data.foundationX;
        const roofY = cell.data.roofBaseY;
        const width = cell.data.houseWidth;
        const step = cell.data.buildStep;

        // Build triangular roof
        // Layer 0: [stone] [empty] [empty] [empty] [stone]
        // Layer 1: [empty] [stone] [empty] [stone] [empty]
        // Layer 2: [empty] [empty] [stone] [empty] [empty]

        const roofHeight = Math.ceil(width / 2);

        if (step < roofHeight * width) {
            const layer = Math.floor(step / width);
            const posInLayer = step % width;

            // Calculate if this position should have stone
            const leftEdge = layer;
            const rightEdge = width - 1 - layer;

            if (posInLayer === leftEdge || posInLayer === rightEdge) {
                this.placeBlock(baseX + posInLayer, roofY - layer, 'stone', grid);
            }

            cell.data.buildStep++;
            return true;
        } else {
            // Roof complete!
            cell.data.buildPhase = 'complete';
            cell.element.color = 0x32CD32; // Lime green (success!)
            return true;
        }
    }

    onComplete(cell, x, y, grid) {
        // House complete! Seed could:
        // 1. Stay as a green marker
        // 2. Transform into a door
        // 3. Disappear

        // For now, just stay as green marker
        return false;
    }

    placeBlock(x, y, material, grid) {
        if (!grid.isInBounds(x, y)) return false;

        const existing = grid.getElement(x, y);
        // Only place if empty or liquid (don't replace solid structures)
        if (existing && (existing.id === 0 || existing.state === 'liquid')) {
            grid.setElement(x, y, grid.registry.get(material));
            return true;
        }
        return false;
    }
}

export default HouseBuilderSeedElement;