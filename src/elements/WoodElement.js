import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class WoodElement extends Element {
    constructor() {
        super(5, 'wood', 0x8b4513, {
            density: 5,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.93, // Extremely hard to ignite (93% resistance = 1.05% chance)
            burnsInto: 'burning_wood',  // Transforms to burning_wood when ignited
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC],
            brushSize: 3, // Medium brush for building
            emissionDensity: 1.0 // Solid placement
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if touching sand or water - if so, transform into growing tree
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        // Check if completely buried (all 4 sides are stone or sand)
        let buriedCount = 0;
        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);
            if (neighborElement && (neighborElement.name === 'stone' || neighborElement.name === 'sand')) {
                buriedCount++;
            }
        }

        // If completely buried, slowly fossilize
        if (buriedCount >= 4) {
            if (!cell.data.burialTime) {
                cell.data.burialTime = 0;
            }
            cell.data.burialTime++;

            // After 1200 frames (20 seconds) of being buried, become fossil
            if (cell.data.burialTime > 1200 && Math.random() > 0.99) {
                const fossilElement = grid.registry.get('fossil');
                if (fossilElement) {
                    grid.setElement(x, y, fossilElement);
                    return true;
                }
            }
        } else {
            // Not buried, reset burial time
            cell.data.burialTime = 0;

            // Check for tree growth
            for (const [nx, ny] of neighbors) {
                const neighborElement = grid.getElement(nx, ny);
                if (neighborElement && (neighborElement.name === 'sand' || neighborElement.name === 'water')) {
                    // Transform into growing tree
                    const treeTrunkElement = grid.registry.get('tree_trunk');
                    if (treeTrunkElement) {
                        grid.setElement(x, y, treeTrunkElement);
                        const newCell = grid.getCell(x, y);
                        if (newCell) {
                            newCell.data.growthStage = 0;
                            newCell.data.growthTimer = 0;
                            newCell.data.canGrow = true;
                        }
                    }
                    return true;
                }
            }
        }

        return false;
    }
}

export default WoodElement;
