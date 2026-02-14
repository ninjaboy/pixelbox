import Element from '../Element.js';
import { STATE, ELEMENT_TYPE } from '../ElementProperties.js';

class WallElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.WALL, 'wall', 0x444444, {
            density: 10,
            state: STATE.SOLID,
            movable: false,  // Static - never moves
            tags: [],
            brushSize: 1,
            emissionDensity: 1.0,
            canInteract: false,  // PERFORMANCE: Skip interaction checks
            // Temperature system (v5.0.0)
            temp: 20,
            insulate: true,
            category: 'solids'
        });
    }

    // Static element - no update logic needed
}

export default WallElement;
