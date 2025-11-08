import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class IceElement extends Element {
    constructor() {
        super(18, 'ice', 0x87ceeb, { // Sky blue
            density: 3,
            state: STATE.SOLID,
            movable: false,
            tags: [TAG.ORGANIC],
            brushSize: 1,
            emissionDensity: 0.8
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check for adjacent heat sources - ice melts
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.HEAT_SOURCE)) {
                // Melt into water (5% chance per frame when near heat)
                if (Math.random() > 0.95) {
                    grid.setElement(x, y, grid.registry.get('water'));
                    return true;
                }
            }
        }

        // Slowly melt at normal temperatures (very slow - 0.1% per frame)
        if (Math.random() > 0.999) {
            grid.setElement(x, y, grid.registry.get('water'));
            return true;
        }

        // Freeze adjacent water (spread the cold)
        if (Math.random() > 0.98) { // 2% chance
            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.name === 'water') {
                    grid.setElement(nx, ny, grid.registry.get('ice'));
                    return true;
                }
            }
        }

        return false;
    }
}

export default IceElement;
