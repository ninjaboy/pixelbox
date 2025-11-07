import Element from '../Element.js';
import { STATE, TEMPERATURE, TAG } from '../ElementProperties.js';

class FireElement extends Element {
    constructor() {
        super(4, 'fire', 0xff6600, { // Vibrant orange-red for more intensity
            density: 0,
            state: STATE.GAS,
            temperature: TEMPERATURE.VERY_HOT,
            dispersion: 2,
            lifetime: 60, // Ephemeral flames - dissipate after 1 second
            tags: [TAG.HEAT_SOURCE],
            brushSize: 2, // Small controlled brush
            emissionDensity: 0.5, // Moderate sparse placement
            glowing: true // Mark as glowing for special rendering
        });
    }

    update(x, y, grid) {
        // Fire should NOT produce steam from thin air
        // Steam is only created when fire evaporates water (handled by interaction system)
        // Fire from burning wood/oil should only produce smoke

        // Emit smoke for visual effect when burning (30% chance)
        if (Math.random() > 0.7) {
            const smokeX = x + (Math.random() > 0.5 ? 1 : -1);
            const smokeY = y - 1;
            if (grid.isEmpty(smokeX, smokeY)) {
                grid.setElement(smokeX, smokeY, grid.registry.get('smoke'));
            }
        }

        // Fire rises chaotically with flickering (70% upward movement)
        if (Math.random() > 0.3) {
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }

            // Diagonal flickering
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y - 1)) {
                grid.swap(x, y, x + dir, y - 1);
                return true;
            }
            if (grid.isEmpty(x - dir, y - 1)) {
                grid.swap(x, y, x - dir, y - 1);
                return true;
            }
        }

        // Occasionally spread sideways (dancing flames)
        if (Math.random() > 0.8) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
        }

        return false;
    }
}

export default FireElement;
