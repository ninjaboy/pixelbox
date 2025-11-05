import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x666666, {
            density: 10,
            state: STATE.SOLID,
            movable: false,
            tags: [],
            brushSize: 3, // Medium brush for building
            emissionDensity: 1.0 // Solid placement
        });
    }

    // Stone doesn't move, so no update logic needed
}

export default StoneElement;
