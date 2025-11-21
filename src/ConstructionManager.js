/**
 * ConstructionManager - Manages persistent house construction
 * Fills ground, builds foundation, then constructs house
 */

import { STATE } from './ElementProperties.js';

const BUILD_SPEED = 1; // Frames per block (1 = every frame, faster construction)

export class ConstructionManager {
    /**
     * Update all active constructions in the grid
     * Called once per frame from PixelGrid.update()
     */
    static updateConstructions(grid) {
        // Scan for cells with _houseConstruction data
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const cell = grid.getCell(x, y);
                if (cell && cell.data._houseConstruction) {
                    this.updateConstruction(cell, x, y, grid);
                }
            }
        }
    }

    static updateConstruction(cell, x, y, grid) {
        const construction = cell.data._houseConstruction;

        // Verify construction data is a valid object, not just a boolean marker
        if (!construction || typeof construction !== 'object') {
            return; // Skip builder markers or invalid data
        }

        construction.buildTimer++;

        // Only place one block every BUILD_SPEED frames
        if (construction.buildTimer % BUILD_SPEED !== 0) {
            return;
        }

        // Update based on phase
        switch (construction.buildPhase) {
            case 'ground_fill':
                this.fillGround(construction, grid);
                break;
            case 'foundation':
                this.buildFoundation(construction, grid);
                break;
            case 'floor1':
                this.buildFloor1(construction, grid);
                break;
            case 'floor2':
                this.buildFloor2(construction, grid);
                break;
            case 'roof':
                this.buildRoof(construction, grid);
                break;
            case 'complete':
                // Remove construction data - we're done!
                delete cell.data._houseConstruction;
                break;
        }
    }

    static fillGround(construction, grid) {
        const centerX = construction.centerX;
        const baseY = construction.baseY;

        // ADAPTIVE GROUND FILLING: Fill gaps and create level surface
        // Scan 5-wide area and fill any gaps below the base level

        // First pass: Find the lowest point in the build area
        if (construction.buildStep === 0) {
            let lowestY = baseY;
            for (let dx = -2; dx <= 2; dx++) {
                const testX = centerX + dx;
                // Scan downward to find the first solid/powder surface
                for (let scanY = baseY; scanY < Math.min(baseY + 10, grid.height); scanY++) {
                    const element = grid.getElement(testX, scanY);
                    if (element && (element.state === STATE.SOLID || element.state === STATE.POWDER)) {
                        // Found solid ground at this column
                        break;
                    }
                    // Empty or liquid - this is where we'll need to place foundation
                    if (scanY > lowestY) {
                        lowestY = scanY;
                    }
                }
            }
            construction.targetBaseY = lowestY; // Store the level where we'll build foundation
            construction.buildStep++;
            return;
        }

        // Fill from bottom up to create solid platform at targetBaseY
        const targetY = construction.targetBaseY;
        const step = construction.buildStep - 1; // Subtract 1 because step 0 was analysis

        // Fill 5-wide area, column by column
        if (step < 5) {
            const fx = centerX - 2 + step;

            // Fill this column from targetY down to first solid surface
            for (let fillY = targetY; fillY < grid.height; fillY++) {
                const existing = grid.getElement(fx, fillY);

                // Stop when we hit solid ground
                if (existing && (existing.state === STATE.SOLID || existing.state === STATE.POWDER)) {
                    break;
                }

                // Fill empty/liquid spaces with stone
                if (existing && (existing.id === 0 || existing.state === 'liquid')) {
                    grid.setElement(fx, fillY, grid.registry.get('stone'));
                }
            }

            construction.buildStep++;
        } else {
            // Ground fill complete - move to foundation phase
            construction.buildPhase = 'foundation';
            construction.buildStep = 0;
            construction.baseY = targetY; // Update baseY to the filled level
        }
    }

    static buildFoundation(construction, grid) {
        const centerX = construction.centerX;
        const baseY = construction.baseY;
        const step = construction.buildStep;

        // Build 5-wide foundation - PERSISTENT, replaces EVERYTHING (including builder)
        if (step < 5) {
            const fx = centerX - 2 + step;
            // Use forcePlaceBlock to replace everything and preserve construction data
            this.forcePlaceBlock(fx, baseY, 'stone', grid);
            construction.buildStep++;
        } else {
            // Foundation complete
            construction.buildPhase = 'floor1';
            construction.buildStep = 0;
            construction.currentY = baseY - 1;
        }
    }

    static buildFloor1(construction, grid) {
        const centerX = construction.centerX;
        const baseY = construction.currentY;
        const step = construction.buildStep;
        const storyHeight = 3;

        // Build left wall, right wall, then ceiling - PERSISTENT
        if (step < storyHeight) {
            // Left wall
            const wallY = baseY - step;
            this.forcePlaceBlock(centerX - 2, wallY, 'wood', grid);
            construction.buildStep++;
        } else if (step < storyHeight * 2) {
            // Right wall
            const wallY = baseY - (step - storyHeight);
            this.forcePlaceBlock(centerX + 2, wallY, 'wood', grid);
            construction.buildStep++;
        } else if (step < storyHeight * 2 + 5) {
            // Ceiling
            const ceilingX = centerX - 2 + (step - storyHeight * 2);
            const ceilingY = baseY - storyHeight;
            this.forcePlaceBlock(ceilingX, ceilingY, 'wood', grid);
            construction.buildStep++;
        } else {
            // Floor 1 complete
            construction.buildPhase = 'floor2';
            construction.buildStep = 0;
            construction.currentY = baseY - storyHeight - 1;
        }
    }

    static buildFloor2(construction, grid) {
        const centerX = construction.centerX;
        const baseY = construction.currentY;
        const step = construction.buildStep;
        const storyHeight = 3;

        if (step < storyHeight) {
            // Left wall
            const wallY = baseY - step;
            // Add window in middle
            const material = (step === Math.floor(storyHeight / 2)) ? 'glass' : 'wood';
            this.forcePlaceBlock(centerX - 2, wallY, material, grid);
            construction.buildStep++;
        } else if (step < storyHeight * 2) {
            // Right wall
            const wallY = baseY - (step - storyHeight);
            this.forcePlaceBlock(centerX + 2, wallY, 'wood', grid);
            construction.buildStep++;
        } else if (step < storyHeight * 2 + 5) {
            // Ceiling
            const ceilingX = centerX - 2 + (step - storyHeight * 2);
            const ceilingY = baseY - storyHeight;
            this.forcePlaceBlock(ceilingX, ceilingY, 'wood', grid);
            construction.buildStep++;
        } else {
            // Floor 2 complete
            construction.buildPhase = 'roof';
            construction.buildStep = 0;
            construction.roofBaseY = baseY - storyHeight - 1;
        }
    }

    static buildRoof(construction, grid) {
        const centerX = construction.centerX;
        const roofY = construction.roofBaseY;
        const step = construction.buildStep;

        // Build peaked roof - PERSISTENT
        // Layer 0: stone at edges
        // Layer 1: stone closer to center
        // Layer 2: stone at peak

        const roofPattern = [
            [-2, 2],      // Layer 0: left and right edges
            [-1, 1],      // Layer 1: closer to center
            [0]           // Layer 2: peak
        ];

        if (step < 5) { // Total blocks in roof = 5
            let blockIndex = 0;
            for (let layer = 0; layer < roofPattern.length; layer++) {
                for (let offset of roofPattern[layer]) {
                    if (blockIndex === step) {
                        const roofX = centerX + offset;
                        const roofLayerY = roofY - layer;
                        this.forcePlaceBlock(roofX, roofLayerY, 'stone', grid);
                        construction.buildStep++;
                        return;
                    }
                    blockIndex++;
                }
            }
        } else {
            // Roof complete!
            construction.buildPhase = 'complete';
        }
    }

    static forcePlaceBlock(x, y, material, grid) {
        // Place block, replacing anything (even walls, obsidian, builders, etc.)
        if (!grid.isInBounds(x, y)) return false;

        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Preserve construction data if it exists
        const constructionData = cell.data._houseConstruction;

        // Replace with new material (builds over EVERYTHING)
        grid.setElement(x, y, grid.registry.get(material));

        // Restore construction data after replacement
        if (constructionData) {
            const newCell = grid.getCell(x, y);
            if (newCell) {
                newCell.data._houseConstruction = constructionData;
            }
        }

        return true;
    }
}

export default ConstructionManager;