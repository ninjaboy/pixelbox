/**
 * ConstructionManager - Manages slow house construction without a visible element
 * Attached as data to foundation blocks, builds incrementally over time
 */

const BUILD_SPEED = 3; // Frames per block (slower = more realistic)

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

        // Build 5-wide foundation
        if (step < 5) {
            const fx = centerX - 2 + step;
            if (this.canPlaceBlock(fx, baseY, grid)) {
                this.placeBlock(fx, baseY, 'stone', grid);
                construction.buildStep++;
            } else {
                // Can't place - pause construction
                return;
            }
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

        // Build left wall, right wall, then ceiling
        if (step < storyHeight) {
            // Left wall
            const wallY = baseY - step;
            if (this.canPlaceBlock(centerX - 2, wallY, grid)) {
                this.placeBlock(centerX - 2, wallY, 'wood', grid);
                construction.buildStep++;
            }
        } else if (step < storyHeight * 2) {
            // Right wall
            const wallY = baseY - (step - storyHeight);
            if (this.canPlaceBlock(centerX + 2, wallY, grid)) {
                this.placeBlock(centerX + 2, wallY, 'wood', grid);
                construction.buildStep++;
            }
        } else if (step < storyHeight * 2 + 5) {
            // Ceiling
            const ceilingX = centerX - 2 + (step - storyHeight * 2);
            const ceilingY = baseY - storyHeight;
            if (this.canPlaceBlock(ceilingX, ceilingY, grid)) {
                this.placeBlock(ceilingX, ceilingY, 'wood', grid);
                construction.buildStep++;
            }
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
            if (this.canPlaceBlock(centerX - 2, wallY, grid)) {
                // Add window in middle
                const material = (step === Math.floor(storyHeight / 2)) ? 'glass' : 'wood';
                this.placeBlock(centerX - 2, wallY, material, grid);
                construction.buildStep++;
            }
        } else if (step < storyHeight * 2) {
            // Right wall
            const wallY = baseY - (step - storyHeight);
            if (this.canPlaceBlock(centerX + 2, wallY, grid)) {
                this.placeBlock(centerX + 2, wallY, 'wood', grid);
                construction.buildStep++;
            }
        } else if (step < storyHeight * 2 + 5) {
            // Ceiling
            const ceilingX = centerX - 2 + (step - storyHeight * 2);
            const ceilingY = baseY - storyHeight;
            if (this.canPlaceBlock(ceilingX, ceilingY, grid)) {
                this.placeBlock(ceilingX, ceilingY, 'wood', grid);
                construction.buildStep++;
            }
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

        // Build peaked roof
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
                        if (this.canPlaceBlock(roofX, roofLayerY, grid)) {
                            this.placeBlock(roofX, roofLayerY, 'stone', grid);
                            construction.buildStep++;
                        }
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

    static canPlaceBlock(x, y, grid) {
        if (!grid.isInBounds(x, y)) return false;
        const existing = grid.getElement(x, y);
        // Only place if empty or liquid
        return existing && (existing.id === 0 || existing.state === 'liquid');
    }

    static placeBlock(x, y, material, grid) {
        if (this.canPlaceBlock(x, y, grid)) {
            grid.setElement(x, y, grid.registry.get(material));
            return true;
        }
        return false;
    }
}

export default ConstructionManager;