/**
 * ConstructionManager - Manages persistent house construction
 * Fills ground, builds foundation, then constructs house
 */

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
        construction.buildTimer++;

        // Only place one block every BUILD_SPEED frames
        if (construction.buildTimer % BUILD_SPEED !== 0) {
            return;
        }

        // Debug: Log construction progress occasionally
        if (construction.buildTimer % 30 === 0) {
            console.log('🏗️ Building:', construction.buildPhase, 'step', construction.buildStep, 'at', x, y);
        }

        // Update based on phase
        switch (construction.buildPhase) {
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

    static buildFoundation(construction, grid) {
        const centerX = construction.centerX;
        const baseY = construction.baseY;
        const step = construction.buildStep;

        // Build 5-wide foundation - PERSISTENT, replaces everything
        if (step < 5) {
            const fx = centerX - 2 + step;
            // Always place, replacing whatever is there (except walls)
            const existing = grid.getElement(fx, baseY);
            if (existing && existing.name !== 'wall') {
                grid.setElement(fx, baseY, grid.registry.get('stone'));
            }
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
            console.log('🏠 House construction complete!');
        }
    }

    static forcePlaceBlock(x, y, material, grid) {
        // Place block, replacing anything except walls and obsidian
        if (!grid.isInBounds(x, y)) return false;

        const existing = grid.getElement(x, y);
        if (!existing) return false;

        // Don't replace permanent structures
        if (existing.name === 'wall' || existing.name === 'obsidian') {
            return false;
        }

        // Replace everything else
        grid.setElement(x, y, grid.registry.get(material));
        return true;
    }
}

export default ConstructionManager;