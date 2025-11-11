import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class ObsidianElement extends Element {
    constructor() {
        super(32, 'obsidian', 0x0a0a14, { // Very dark purple-black
            density: 10, // Very heavy, like stone
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 1.0, // Cannot burn
            tags: [TAG.MINERAL],
            brushSize: 2,
            emissionDensity: 0.8
        });
    }

    update(x, y, grid) {
        // Obsidian is inert and permanent
        return false;
    }
}

export default ObsidianElement;
