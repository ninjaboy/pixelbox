import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class CoalElement extends Element {
    constructor() {
        super(29, 'coal', 0x1a1a1a, { // Very dark gray/black
            density: 5,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.70, // Harder to ignite than wood
            burnsInto: 'burning_coal',
            tags: [TAG.COMBUSTIBLE],
            brushSize: 2,
            emissionDensity: 0.7
        });
    }

    update(x, y, grid) {
        // Coal is inert until ignited
        return false;
    }
}

export default CoalElement;
