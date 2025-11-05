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
        // Burning wood is a slow fuel source that emits fire above it
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        const remainingLife = cell.lifetime;
        const totalLife = 900;
        const burnProgress = 1 - (remainingLife / totalLife); // 0 = just ignited, 1 = almost done

        // Early burn stage (0-33%) - igniting, building up
        if (burnProgress < 0.33) {
            // Moderate fire emission
            if (Math.random() > 0.93) {
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
            // Sustained fire emission
            if (Math.random() > 0.90) {
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
            // Rare fire
            if (Math.random() > 0.97) {
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
