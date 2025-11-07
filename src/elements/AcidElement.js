import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class AcidElement extends Element {
    constructor() {
        super(23, 'acid', 0x7fff00, { // Bright yellow-green
            density: 1.2, // Slightly denser than water
            state: STATE.LIQUID,
            movable: true,
            tags: [],
            brushSize: 2,
            emissionDensity: 0.6
        });
    }

    update(x, y, grid) {
        // Acid dissolves adjacent materials
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        // Try to dissolve something (15% chance per frame)
        if (Math.random() > 0.85) {
            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);

                // Acid dissolves most organic and some inorganic materials
                if (neighbor) {
                    const dissolvableElements = [
                        'wood', 'leaf', 'tree_branch', 'tree_trunk', 'tree_seed',
                        'ash', 'sand', 'dirt', 'stone', 'salt',
                        'burning_wood', 'fish'
                    ];

                    if (dissolvableElements.includes(neighbor.name)) {
                        // Dissolve the material (replace with smoke)
                        grid.setElement(nx, ny, grid.registry.get('smoke'));

                        // Acid gets diluted (5% chance to turn into water)
                        if (Math.random() > 0.95) {
                            grid.setElement(x, y, grid.registry.get('water'));
                        }
                        return true;
                    }
                }
            }
        }

        // Acid neutralizes when mixed with water (becomes diluted)
        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // 5% chance to neutralize into water
                if (Math.random() > 0.95) {
                    grid.setElement(x, y, grid.registry.get('water'));
                    return true;
                }
            }
        }

        // Acid flows like liquid
        const below = grid.getElement(x, y + 1);

        // Flow through lighter materials
        if (below && below.density < this.density) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Fall straight down if empty
        if (grid.isEmpty(x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Diagonal fall
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.isEmpty(x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (grid.isEmpty(x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        // Flow sideways
        if (Math.random() > 0.5) {
            if (grid.isEmpty(x + dir, y)) {
                grid.swap(x, y, x + dir, y);
                return true;
            }
            if (grid.isEmpty(x - dir, y)) {
                grid.swap(x, y, x - dir, y);
                return true;
            }
        }

        return false;
    }
}

export default AcidElement;
