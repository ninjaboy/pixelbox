import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class SandElement extends Element {
    constructor() {
        super(1, 'sand', 0xc2b280, {
            density: 3,
            state: STATE.POWDER,
            dispersion: 1,
            tags: [],
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });
    }

    update(x, y, grid) {
        // Try to fall down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Angle of repose: only slide diagonally if there's space below diagonal
        // This creates realistic pile formation at ~45° (adjustable with probability)
        const dir = Math.random() > 0.5 ? -1 : 1;

        // Check if diagonal slide would be stable (has support)
        const hasSupport = !grid.isEmpty(x + dir, y + 2);

        // Only slide if moving to unstable position or with low probability when stable
        const shouldSlide = !hasSupport || Math.random() > 0.85;

        if (shouldSlide && grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (shouldSlide && grid.canMoveTo(x, y, x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        return false;
    }
}

export default SandElement;
