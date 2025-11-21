import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class GlassElement extends Element {
    constructor() {
        super(21, 'glass', 0xadd8e6, { // Light blue, semi-transparent look
            density: 5,
            state: STATE.SOLID,
            movable: false,
            tags: [TAG.COMBUSTIBLE],
            ignitionResistance: 0.9, // Very resistant to fire, but can eventually break
            burnsInto: 'empty', // Glass shatters/melts into nothing when destroyed by fire
            brushSize: 1,
            emissionDensity: 0.8,
            canInteract: false  // PERFORMANCE: Skip interaction checks
        });
    }

    updateImpl(x, y, grid) {
        // Glass is inert - doesn't react or move
        // In the future could add:
        // - Breaking mechanics when under pressure
        // - Melting back into sand at very high temperatures
        // - Light refraction effects

        return false;
    }
}

export default GlassElement;
