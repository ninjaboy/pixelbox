import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class WallElement extends Element {
    constructor() {
        super(18, 'wall', 0x444444, {
            density: 10,
            state: STATE.SOLID,
            movable: false,  // Static - never moves
            tags: [],
            brushSize: 3,
            emissionDensity: 1.0
        });
    }

    // Static element - no update logic needed
}

export default WallElement;
