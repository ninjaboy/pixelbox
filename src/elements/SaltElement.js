import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class SaltElement extends Element {
    constructor() {
        super(19, 'salt', 0xffffff, { // White
            density: 4,
            state: STATE.SOLID,
            movable: true,
            tags: [],
            brushSize: 2,
            emissionDensity: 0.7
        });
    }

    update(x, y, grid) {
        // Salt falls like sand
        const below = grid.getElement(x, y + 1);

        if (below && below.density < this.density) {
            // Heavier than element below - fall through
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Dissolve in water (creates salt water - just becomes water)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // 10% chance to dissolve
                if (Math.random() > 0.9) {
                    grid.setElement(x, y, grid.registry.get('water'));
                    return true;
                }
            }
        }

        // Diagonal falling
        if (grid.isEmpty(x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.isEmpty(x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (grid.isEmpty(x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        return false;
    }
}

export default SaltElement;
