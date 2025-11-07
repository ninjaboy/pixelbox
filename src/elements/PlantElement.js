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
            cell.data.growthStage = 0; // 0 = seedling, 1-3 = growing, 4 = mature
        }

        // Plants need wet sand or dirt below to survive
        const below = grid.getElement(x, y + 1);
        const hasGround = below && (below.name === 'sand' || below.name === 'dirt' || below.name === 'plant');

        if (!hasGround) {
            // Plant dies without ground support, becomes ash
            if (Math.random() > 0.95) {
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }
            return false;
        }

        // Check if there's water nearby (plants need moisture)
        let hasWater = false;
        const waterCheckRadius = 2;

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

        // Plants grow slowly when near water
        if (hasWater && Math.random() > 0.995) { // 0.5% chance per frame
            cell.data.growthStage++;

            // Mature plants (stage 4+) can spread
            if (cell.data.growthStage >= 4) {
                // Try to grow adjacent plants (spread)
                if (Math.random() > 0.98) { // 2% chance when mature
                    const growthPositions = [
                        [x, y - 1], // Grow upward
                        [x - 1, y], [x + 1, y] // Spread sideways
                    ];

                    // Shuffle positions
                    growthPositions.sort(() => Math.random() - 0.5);

                    for (const [nx, ny] of growthPositions) {
                        if (grid.isEmpty(nx, ny)) {
                            // Check if new position has ground below
                            const newBelow = grid.getElement(nx, ny + 1);
                            if (newBelow && (newBelow.name === 'sand' || newBelow.name === 'dirt' || newBelow.name === 'plant')) {
                                grid.setElement(nx, ny, grid.registry.get('plant'));
                                return true;
                            }
                        }
                    }
                }
            }
        }

        // Plants die without water (very slowly)
        if (!hasWater && Math.random() > 0.999) { // 0.1% chance to die
            grid.setElement(x, y, grid.registry.get('ash'));
            return true;
        }

        return false;
    }
}

export default PlantElement;
