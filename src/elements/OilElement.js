import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class OilElement extends Element {
    constructor() {
        super(7, 'oil', 0x3d3d1a, {
            density: 1.5,              // Less dense than water (floats!)
            state: STATE.LIQUID,
            dispersion: 2,             // Doesn't spread as much as water
            ignitionResistance: 0.2,   // Easy to ignite (20% resistance = 12% ignition chance)
            tags: [TAG.COMBUSTIBLE],   // Will ignite near fire!
            burnsInto: 'fire',         // Becomes fire when ignited (burns fast!)
            brushSize: 5,              // Large pour brush
            emissionDensity: 1.0       // Continuous pour
        });
    }

    // Custom interaction for oil burning
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        // When oil touches fire
        if (otherElement.hasTag(TAG.HEAT_SOURCE)) {
            const rand = Math.random();

            // 40% chance to create fire above/beside the oil (surface burning)
            if (rand > 0.6) {
                // Try to create fire above this oil
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('fire'));
                    return true;
                }

                // Or to the sides
                const dir = Math.random() > 0.5 ? 1 : -1;
                if (grid.isEmpty(x + dir, y)) {
                    grid.setElement(x + dir, y, grid.registry.get('fire'));
                    return true;
                }
            }

            // 20% chance to actually convert to fire (was 10%)
            if (rand > 0.8) {
                grid.setElement(x, y, grid.registry.get('fire'));
                // Also emit smoke
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('smoke'));
                }
                return true;
            }

            return true; // Interaction occurred but oil stays
        }

        return null; // Use default interaction system
    }

    update(x, y, grid) {
        // Check if there's fire nearby - oil heats up and can ignite from nearby fire
        if (Math.random() > 0.95) {
            const nearbyFire = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
                [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
            ];

            for (const [fx, fy] of nearbyFire) {
                const neighbor = grid.getElement(fx, fy);
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.HEAT_SOURCE)) {
                    // Found fire nearby, create fire on this oil occasionally
                    if (Math.random() > 0.5) {
                        grid.setElement(x, y, grid.registry.get('fire'));
                        return true;
                    }
                }
            }
        }

        // Try to fall down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal fall
        const fallDir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + fallDir, y + 1)) {
            grid.swap(x, y, x + fallDir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - fallDir, y + 1)) {
            grid.swap(x, y, x - fallDir, y + 1);
            return true;
        }

        // Flow sideways (less than water)
        if (Math.random() > 0.3) { // Only flow 70% of the time
            const flowDir = Math.random() > 0.5 ? 1 : -1;
            if (grid.canMoveTo(x, y, x + flowDir, y)) {
                grid.swap(x, y, x + flowDir, y);
                return true;
            }
            if (grid.canMoveTo(x, y, x - flowDir, y)) {
                grid.swap(x, y, x - flowDir, y);
                return true;
            }
        }

        return false;
    }
}

export default OilElement;
