import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class WetGunpowderElement extends Element {
    constructor() {
        super(19, 'wet_gunpowder', 0x2a2a1a, {
            density: 4,  // Heavy when wet
            state: STATE.POWDER,
            movable: true,
            ignitionResistance: 0.95,  // Very hard to ignite but possible
            burnsInto: 'fire',
            tags: [TAG.COMBUSTIBLE],  // Can burn, but slowly
            brushSize: 0,
            emissionDensity: 0
        });
    }

    update(x, y, grid) {
        // Check if touching water or wet_sand - stays completely wet
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        let isTouchingWater = false;
        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && (neighbor.name === 'water' || neighbor.name === 'wet_sand')) {
                isTouchingWater = true;
                break;
            }
        }

        // Store water contact status for interaction
        const cell = grid.getCell(x, y);
        if (cell) {
            cell.data.isTouchingWater = isTouchingWater;
        }

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

        // Slowly dry out ONLY if not touching water (0.05% chance per frame)
        if (!isTouchingWater && Math.random() > 0.9995) {
            const dryGunpowder = grid.registry.get('gunpowder');
            if (dryGunpowder) {
                grid.setElement(x, y, dryGunpowder);
                return true;
            }
        }

        return false;
    }

    // Custom interaction to handle burning
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        const cell = grid.getCell(x, y);

        // Check if touching a heat source
        if (otherElement.hasTag && otherElement.hasTag(TAG.HEAT_SOURCE)) {
            // Wet gunpowder burns slowly (3% chance per frame)
            // Lower chance if touching water (1% chance)
            const burnChance = (cell && cell.data.isTouchingWater) ? 0.01 : 0.03;

            if (Math.random() < burnChance) {
                const fireElement = grid.registry.get('fire');
                if (fireElement) {
                    grid.setElement(x, y, fireElement);
                    return true; // Interaction handled
                }
            }

            // Even if it doesn't ignite, return true to prevent default interaction
            return true;
        }

        // Let other interactions proceed normally
        return null;
    }
}

export default WetGunpowderElement;
