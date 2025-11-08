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

        // IVY BEHAVIOR: Check if attached to ANY solid surface (not just ground)
        const adjacentPositions = [
            [x, y - 1], [x, y + 1], // above, below
            [x - 1, y], [x + 1, y]  // left, right
        ];

        let hasSupport = false;
        const supportingSurfaces = [];

        for (const [nx, ny] of adjacentPositions) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name !== 'empty' && neighbor.state === STATE.SOLID) {
                hasSupport = true;
                supportingSurfaces.push([nx, ny]);
            }
        }

        // Ivy dies VERY slowly without any solid surface to attach to
        if (!hasSupport) {
            if (Math.random() > 0.98) { // 2% chance per frame (faster than with support)
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }
            return false;
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

        // Grow and mature over time
        const growthRate = hasWater ? 0.998 : 0.9995; // Faster with water
        if (Math.random() > growthRate) {
            cell.data.growthStage++;
        }

        // SHRUB/IVY SPREADING: Grows along ANY surface
        if (cell.data.growthStage >= 3 && Math.random() > 0.97) { // 3% chance when mature
            // Find all empty spaces adjacent to solid surfaces
            const growthCandidates = [];

            // Check all 8 directions (including diagonals for better coverage)
            const allDirections = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
                [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
            ];

            for (const [nx, ny] of allDirections) {
                if (grid.isEmpty(nx, ny)) {
                    // Check if this empty space is adjacent to a solid surface
                    const nearbyPositions = [
                        [nx, ny - 1], [nx, ny + 1],
                        [nx - 1, ny], [nx + 1, ny]
                    ];

                    for (const [checkX, checkY] of nearbyPositions) {
                        const checkElement = grid.getElement(checkX, checkY);
                        if (checkElement && checkElement.name !== 'empty' && checkElement.state === STATE.SOLID) {
                            growthCandidates.push([nx, ny]);
                            break; // Found a surface, this is a valid growth spot
                        }
                    }
                }
            }

            // Grow to one random candidate location
            if (growthCandidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * growthCandidates.length);
                const [growX, growY] = growthCandidates[randomIndex];
                grid.setElement(growX, growY, grid.registry.get('plant'));
                return true;
            }
        }

        // Plants are very resilient - only die in extreme conditions (no support)
        // With support, they live indefinitely

        return false;
    }
}

export default PlantElement;
