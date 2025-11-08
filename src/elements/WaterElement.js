import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';

class WaterElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.WATER, 'water', 0x0099ff, { // Brighter, more vibrant blue
            density: 2,
            state: STATE.LIQUID,
            dispersion: 3,
            evaporatesInto: 'steam',  // Transforms to steam when heated
            tags: new Set([TAG.EVAPORATES, TAG.SOLIDIFIES_LAVA, TAG.EXTINGUISHES_FIRE]),
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });

        // Use standardized liquid flow behavior
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 4,
            dispersionRate: 2,
            viscosity: 0, // Water is not viscous
            levelingEnabled: true,
            avoidElements: ['lava'] // Don't flow into lava
        });
    }

    update(x, y, grid) {
        // Surface evaporation (element-specific behavior)
        const above = grid.getElement(x, y - 1);
        if (above && above.id === 0) {
            const isAtSurface = this.isAtSurface(x, y, grid);
            if (isAtSurface && Math.random() < 0.0001) {
                grid.setElement(x, y, grid.registry.get('steam'));
                return true;
            }
        }

        // Seep through wet sand (permeability)
        const below = grid.getElement(x, y + 1);
        if (below && below.name === 'wet_sand') {
            const belowWetSand = grid.getElement(x, y + 2);
            if (belowWetSand && belowWetSand.id === 0 && Math.random() > 0.93) {
                grid.swap(x, y, x, y + 2);
                return true;
            }
        }

        // Delegate to standardized liquid flow behavior
        return this.movement.apply(x, y, grid);
    }

    // Check if water is at the surface (top edge of water body)
    isAtSurface(x, y, grid) {
        const above = grid.getElement(x, y - 1);
        if (!above || above.id !== 0) {
            return false; // Not at surface if something is above
        }

        // Also check if there's water or solid below (not floating in air)
        const below = grid.getElement(x, y + 1);
        if (!below || below.id === 0) {
            // Check diagonal support
            const belowLeft = grid.getElement(x - 1, y + 1);
            const belowRight = grid.getElement(x + 1, y + 1);

            // At surface if it has support below or to the sides
            return (below && below.id !== 0) ||
                   (belowLeft && belowLeft.name === 'water') ||
                   (belowRight && belowRight.name === 'water');
        }

        return true;
    }
}

export default WaterElement;
