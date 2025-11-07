import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeBranchElement extends Element {
    constructor() {
        super(12, 'tree_branch', 0x8b5a3c, {
            density: 5,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.70, // Moderately flammable (living wood slightly harder than dead wood)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    // Static element - no update logic needed
    // Tree growth is now handled entirely by TreeSeedElement's fractal algorithm
}

export default TreeBranchElement;
