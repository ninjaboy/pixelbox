import Element from '../Element.js';
import { STATE, ELEMENT_TYPE } from '../ElementProperties.js';

class LightElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.LIGHT, 'light', 0xfff4e0, { // Warm white light
            density: 0,
            state: STATE.SOLID,
            movable: false,
            tags: [],
            brushSize: 0,
            emissionDensity: 1.0,
            glowing: true, // Light glows!
            temp: 20,
            category: 'special'
        });
    }

    updateImpl(x, y, grid) {
        // Lights are static - no updates needed
        return false;
    }
}

export default LightElement;
