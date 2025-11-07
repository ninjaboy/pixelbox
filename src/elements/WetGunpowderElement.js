import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class WetGunpowderElement extends Element {
    constructor() {
        super(19, 'wet_gunpowder', 0x2a2a1a, {
            density: 4,  // Heavy when wet
            state: STATE.POWDER,
            movable: true,
            tags: [],  // Not combustible when wet
            brushSize: 0,
            emissionDensity: 0
        });
    }

    update(x, y, grid) {
        // Wet gunpowder acts like heavy sand
        // Try to fall down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal falling
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        // Slowly dry out (very slow - 0.05% chance per frame)
        if (Math.random() > 0.9995) {
            const dryGunpowder = grid.registry.get('gunpowder');
            if (dryGunpowder) {
                grid.setElement(x, y, dryGunpowder);
                return true;
            }
        }

        return false;
    }
}

export default WetGunpowderElement;
