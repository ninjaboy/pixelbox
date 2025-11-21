import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class LightElement extends Element {
    constructor() {
        super(50, 'light', 0xfff4e0, { // Warm white light
            density: 0,
            state: STATE.SOLID,
            movable: false,
            tags: [],
            brushSize: 0,
            emissionDensity: 1.0,
            glowing: true // Light glows!
        });
    }

    updateImpl(x, y, grid) {
        // Lights are static - no updates needed
        return false;
    }
}

export default LightElement;
