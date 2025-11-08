import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class LavaElement extends Element {
    constructor() {
        super(22, 'lava', 0xff4500, { // Bright orange-red
            density: 8,
            state: STATE.LIQUID,
            movable: true,
            tags: [TAG.HEAT_SOURCE],
            brushSize: 3,
            emissionDensity: 0.7
            // No lifetime - lava is nearly eternal like Minecraft
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Lava is nearly eternal - only cools when touching water
        // No natural cooling like Minecraft lava

        // Lava melts adjacent stone (10% chance)
        if (Math.random() > 0.9) {
            const neighbors = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.name === 'stone') {
                    grid.setElement(nx, ny, grid.registry.get('lava'));
                    return true;
                }
            }
        }

        // Lava ignites combustible materials
        if (Math.random() > 0.8) {
            const neighbors = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.COMBUSTIBLE)) {
                    const ignited = neighbor.burnsInto ? grid.registry.get(neighbor.burnsInto) : grid.registry.get('fire');
                    grid.setElement(nx, ny, ignited);
                    return true;
                }
            }
        }

        // Lava + Water interaction: creates steam and lava cools to stone
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // Water evaporates into steam
                grid.setElement(nx, ny, grid.registry.get('steam'));

                // Lava cools into stone when touching water (like Minecraft obsidian formation)
                if (Math.random() > 0.5) { // 50% chance to cool per water contact
                    grid.setElement(x, y, grid.registry.get('stone'));
                    return true;
                }
                return true;
            }
        }

        // Emit smoke above lava (20% chance)
        if (Math.random() > 0.8) {
            if (grid.isEmpty(x, y - 1)) {
                grid.setElement(x, y - 1, grid.registry.get('smoke'));
            }
        }

        // Lava flows like heavy liquid
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

        // Flow sideways slowly (lava is viscous)
        if (Math.random() > 0.7) {
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

export default LavaElement;
