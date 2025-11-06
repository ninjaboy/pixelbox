import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class GunpowderElement extends Element {
    constructor() {
        super(14, 'gunpowder', 0x333333, { // Dark gray/black
            density: 3, // Same as sand for consistent powder behavior
            state: STATE.POWDER,
            dispersion: 1,
            ignitionResistance: 0.0, // EXTREMELY easy to ignite (15% chance)
            burnsInto: 'fire',
            tags: [TAG.COMBUSTIBLE, TAG.EXPLOSIVE],
            brushSize: 4, // Medium-large pour brush
            emissionDensity: 1.0 // Pour like sand
        });
    }

    update(x, y, grid) {
        // Gunpowder falls like sand with angle of repose
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Angle of repose: stable piles like sand
        const dir = Math.random() > 0.5 ? -1 : 1;

        const hasSupport = !grid.isEmpty(x + dir, y + 2);
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

    // Custom interaction for explosive chain reactions
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        // When gunpowder touches heat source - INSTANT IGNITION
        if (otherElement.hasTag(TAG.HEAT_SOURCE)) {
            // Very high chance to ignite immediately (90%)
            if (Math.random() > 0.1) {
                this.explode(x, y, grid);
                return true;
            }
        }

        return null; // Use default interaction system
    }

    explode(x, y, grid) {
        // Create fire at this position
        grid.setElement(x, y, grid.registry.get('fire'));

        // Rapidly ignite adjacent gunpowder (chain reaction)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'gunpowder') {
                // High chance to ignite neighboring gunpowder (70%)
                if (Math.random() > 0.3) {
                    grid.setElement(nx, ny, grid.registry.get('fire'));
                }
            }
        }

        // Also create some smoke from the explosion
        if (Math.random() > 0.5) {
            const smokeX = x + (Math.random() > 0.5 ? 1 : -1);
            const smokeY = y - 1;
            if (grid.isEmpty(smokeX, smokeY)) {
                grid.setElement(smokeX, smokeY, grid.registry.get('smoke'));
            }
        }
    }
}

export default GunpowderElement;
