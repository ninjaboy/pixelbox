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
            emissionDensity: 0.7,
            lifetime: 3600 // Very slow cooling: 60 seconds (nearly eternal but eventually hardens)
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize cooling data
        if (cell.data.coolingTime === undefined) {
            cell.data.coolingTime = 0;
        }

        // Slow natural cooling (60 seconds to harden into stone)
        cell.data.coolingTime++;

        // After 60 seconds, lava cools into stone
        if (cell.data.coolingTime >= this.lifetime) {
            grid.setElement(x, y, grid.registry.get('stone'));
            return true;
        }

        // Lava does NOT melt stone - stone acts as a container for lava

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

                // Lava cools faster when touching water (accelerates cooling)
                cell.data.coolingTime += 10; // Speed up cooling significantly

                // If cooled enough, instantly harden to stone
                if (cell.data.coolingTime >= this.lifetime * 0.5) { // 50% cooling progress = instant stone
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

        // Flow through lighter materials (but NOT through stone/wall - they contain lava)
        if (below && below.density < this.density &&
            below.name !== 'stone' && below.name !== 'wall' && below.name !== 'glass') {
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
