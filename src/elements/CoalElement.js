import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class CoalElement extends Element {
    constructor() {
        super(29, 'coal', 0x1a1a1a, { // Very dark gray/black
            density: 5,
            state: STATE.SOLID,
            movable: true, // Coal can fall
            ignitionResistance: 0.70, // Harder to ignite than wood
            burnsInto: 'burning_coal',
            tags: [TAG.COMBUSTIBLE],
            brushSize: 2,
            emissionDensity: 0.7
        });
    }

    update(x, y, grid) {
        // Coal falls straight down when unsupported
        const below = grid.getElement(x, y + 1);

        // Fall through empty space
        if (below && below.id === 0) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Displace liquids (coal sinks through water, oil)
        if (below && below.state === 'liquid' && this.density > below.density) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Coal doesn't slide diagonally - it just piles up
        return false;
    }
}

export default CoalElement;
