import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class ElectricityElement extends Element {
    constructor() {
        super(35, 'electricity', 0xffff00, { // Bright yellow/electric blue
            density: 0, // Massless like fire
            state: STATE.GAS,
            movable: true,
            tags: [TAG.HEAT_SOURCE], // Can ignite things
            brushSize: 0, // Single pixel (or don't allow direct placement)
            emissionDensity: 0.3 // Sparse placement if allowed
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize lifetime
        if (cell.data.lifetime === undefined) {
            cell.data.lifetime = 5 + Math.floor(Math.random() * 10); // 5-15 frames
            cell.data.hasConducted = false;
        }

        // Decrement lifetime
        cell.data.lifetime--;

        // Disappear when lifetime expires
        if (cell.data.lifetime <= 0) {
            grid.setElement(x, y, grid.registry.get('empty'));
            return true;
        }

        // CONDUCTION THROUGH WATER (only once per electricity particle)
        if (!cell.data.hasConducted) {
            const neighbors = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);

                // Conduct through conductive materials (water, etc.)
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.CONDUCTIVE)) {
                    if (Math.random() < 0.4) { // 40% chance to spread
                        grid.setElement(nx, ny, grid.registry.get('electricity'));
                        cell.data.hasConducted = true; // Mark as conducted to prevent infinite spread
                        return true;
                    }
                }

                // Ignite combustible materials (chance based)
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.COMBUSTIBLE)) {
                    if (Math.random() < 0.5) { // 50% chance to ignite
                        const ignited = neighbor.burnsInto
                            ? grid.registry.get(neighbor.burnsInto)
                            : grid.registry.get('fire');
                        grid.setElement(nx, ny, ignited);
                        return true;
                    }
                }
            }
        }

        // LIGHTNING BEHAVIOR: Move downward rapidly (like a bolt)
        if (Math.random() < 0.7) { // 70% chance to move down
            const below = grid.getElement(x, y + 1);

            // Move through empty space or conductive materials
            if (below && (below.name === 'empty' || (below.hasTag && below.hasTag(TAG.CONDUCTIVE)))) {
                if (below.hasTag && below.hasTag(TAG.CONDUCTIVE)) {
                    // Spread when hitting conductive material
                    grid.setElement(x, y + 1, grid.registry.get('electricity'));
                } else {
                    // Move through empty
                    grid.swap(x, y, x, y + 1);
                }
                return true;
            }

            // Occasional diagonal movement (lightning branches)
            if (Math.random() < 0.3) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const diagonal = grid.getElement(x + dir, y + 1);
                if (diagonal && diagonal.name === 'empty') {
                    grid.swap(x, y, x + dir, y + 1);
                    return true;
                }
            }
        }

        return false;
    }
}

export default ElectricityElement;
