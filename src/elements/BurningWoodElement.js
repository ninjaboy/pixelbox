import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class BurningWoodElement extends Element {
    constructor() {
        super(9, 'burning_wood', 0xff4500, { // Orange-red color for burning wood
            density: 5,
            state: STATE.SOLID,
            movable: false,
            lifetime: 900, // Burns for 900 frames (15 seconds at 60fps) - much slower!
            ignitionResistance: 0.95, // Very hard to re-ignite (mostly stays as burning wood)
            burnsInto: 'fire', // If re-ignited, becomes fire (shouldn't happen often)
            tags: [TAG.HEAT_SOURCE, TAG.COMBUSTIBLE] // Can spread fire AND still burn
        });
    }

    update(x, y, grid) {
        // Burning wood is a slow fuel source that emits fire AND spreads to adjacent materials
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        const remainingLife = cell.lifetime;
        const totalLife = 900;
        const burnProgress = 1 - (remainingLife / totalLife); // 0 = just ignited, 1 = almost done

        // AGGRESSIVE FIRE SPREADING - spread to adjacent combustible materials
        // Check all 4 cardinal directions for wood to ignite
        const spreadChance = burnProgress < 0.66 ? 0.85 : 0.92; // Higher spread during peak burning
        if (Math.random() > spreadChance) {
            const directions = [
                [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
            ];

            // Shuffle for random spread direction
            directions.sort(() => Math.random() - 0.5);

            for (const [nx, ny] of directions) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.hasTag && neighbor.hasTag('combustible')) {
                    // Try to ignite adjacent combustible material
                    const ignited = neighbor.burnsInto ? grid.registry.get(neighbor.burnsInto) : grid.registry.get('fire');
                    grid.setElement(nx, ny, ignited);
                    return true; // Only spread to one neighbor per frame
                }
            }
        }

        // Early burn stage (0-33%) - igniting, building up
        if (burnProgress < 0.33) {
            // Strong fire emission upward
            if (Math.random() > 0.85) {
                // Emit fire upward (surface burning)
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('fire'));
                    return true;
                }
            }

            // Some smoke
            if (Math.random() > 0.95) {
                const smokeX = x + (Math.random() > 0.5 ? 1 : -1);
                if (grid.isEmpty(smokeX, y - 1)) {
                    grid.setElement(smokeX, y - 1, grid.registry.get('smoke'));
                }
            }
        }
        // Peak burn stage (33-66%) - hottest, most fire
        else if (burnProgress < 0.66) {
            // Very strong fire emission
            if (Math.random() > 0.80) {
                // Strong fire emission
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('fire'));
                    return true;
                }
            }

            // Moderate smoke
            if (Math.random() > 0.93) {
                const smokeX = x + (Math.random() > 0.5 ? 1 : -1);
                if (grid.isEmpty(smokeX, y - 1)) {
                    grid.setElement(smokeX, y - 1, grid.registry.get('smoke'));
                }
            }
        }
        // Late burn stage (66-100%) - dying down, mostly embers
        else {
            // Occasional fire
            if (Math.random() > 0.93) {
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('fire'));
                    return true;
                }
            }

            // Lots of smoke
            if (Math.random() > 0.88) {
                const smokeX = x + (Math.random() > 0.5 ? 1 : -1);
                if (grid.isEmpty(smokeX, y - 1)) {
                    grid.setElement(smokeX, y - 1, grid.registry.get('smoke'));
                }
            }
        }

        return false;
    }
}

export default BurningWoodElement;
