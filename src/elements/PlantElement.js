import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class PlantElement extends Element {
    constructor() {
        super(24, 'plant', 0x32cd32, { // Lime green
            density: 2,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.80, // Somewhat resistant to fire (living plants have moisture)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC],
            brushSize: 1,
            emissionDensity: 0.5
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize growth stage
        if (cell.data.growthStage === undefined) {
            cell.data.growthStage = 0;
        }

        // GRASS BEHAVIOR: Must be on TOP of suitable ground
        const below = grid.getElement(x, y + 1);

        // List of surfaces grass can grow on
        const grassSurfaces = ['sand', 'wet_sand', 'stone', 'wood', 'fossil', 'salt'];

        // Check if on valid ground
        const hasGround = below && grassSurfaces.includes(below.name);

        // Grass dies if not on proper ground
        if (!hasGround) {
            if (Math.random() > 0.95) { // 5% chance to die per frame
                grid.setElement(x, y, grid.registry.get('empty'));
                return true;
            }
            return false;
        }

        // Check if something is on top (grass only grows as surface layer)
        const above = grid.getElement(x, y - 1);
        if (above && above.id !== 0 && above.name !== 'plant') {
            // If covered, slowly die
            if (Math.random() > 0.99) {
                grid.setElement(x, y, grid.registry.get('empty'));
                return true;
            }
        }

        // Check for moisture (optional, makes growth faster)
        let hasWater = false;
        const waterCheckRadius = 3;

        for (let dy = -waterCheckRadius; dy <= waterCheckRadius; dy++) {
            for (let dx = -waterCheckRadius; dx <= waterCheckRadius; dx++) {
                const neighbor = grid.getElement(x + dx, y + dy);
                if (neighbor && neighbor.name === 'water') {
                    hasWater = true;
                    break;
                }
            }
            if (hasWater) break;
        }

        // Grow and mature over time (MUCH FASTER)
        const growthRate = hasWater ? 0.95 : 0.98; // Very fast growth, even faster with water
        if (Math.random() > growthRate) {
            cell.data.growthStage++;
        }

        // Drop seeds occasionally when mature (like trees)
        if (cell.data.growthStage >= 2 && Math.random() > 0.995) { // 0.5% chance per frame
            if (grid.isEmpty(x, y - 1)) {
                grid.setElement(x, y - 1, grid.registry.get('grass_seed'));
                return true;
            }
        }

        // GRASS SPREADING: Grows horizontally on surface layer only (VERY AGGRESSIVE)
        if (cell.data.growthStage >= 2 && Math.random() > 0.90) { // 10% chance when mature!
            // Only spread left or right (horizontal spreading)
            const spreadDir = Math.random() > 0.5 ? 1 : -1;
            const spreadDistance = Math.floor(Math.random() * 2) + 1; // 1-2 cells away
            const targetX = x + (spreadDir * spreadDistance);
            const targetY = y;

            // Check if target position is valid
            if (grid.isEmpty(targetX, targetY)) {
                const targetBelow = grid.getElement(targetX, targetY + 1);

                // Can spread to this location if:
                // 1. There's valid ground below
                // 2. OR there's water below (rare - can grow over small ponds)
                const validGround = targetBelow && grassSurfaces.includes(targetBelow.name);
                const overWater = targetBelow && targetBelow.name === 'water' && Math.random() > 0.95; // 5% chance over water

                if (validGround || overWater) {
                    grid.setElement(targetX, targetY, grid.registry.get('plant'));
                    return true;
                }
            }
        }

        // Plants are very resilient - only die in extreme conditions (no support)
        // With support, they live indefinitely

        return false;
    }
}

export default PlantElement;
