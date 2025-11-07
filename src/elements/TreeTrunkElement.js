import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeTrunkElement extends Element {
    constructor() {
        super(11, 'tree_trunk', 0x6b4423, {
            density: 6,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.75, // Trunk is hardest to burn but still flammable (living wood core)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    // Static element - no update logic needed
    // Tree growth is now handled entirely by TreeSeedElement's fractal algorithm
}

export default TreeTrunkElement;
