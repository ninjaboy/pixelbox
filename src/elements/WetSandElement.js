import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';
import { WetDryTransitionBehavior } from '../behaviors/TransformationBehaviors.js';

class WetSandElement extends Element {
    constructor() {
        super(18, 'wet_sand', 0x8b7355, { // Darker brown color
            density: 9, // Much heavier than lava (8) - wet sand blocks lava flow
            state: STATE.POWDER,
            dispersion: 0,
            tags: [],
            lifetime: -1, // No automatic decay - controlled by exposure logic
            brushSize: 5,
            emissionDensity: 1.0
        });

        // Behavior 1: Wet/dry transition with exposure requirement
        // WetSand dries via time-based exposure (600 frames), not probabilistic
        // So we'll handle it manually but use behavior for water contact tracking
        this.addBehavior(new WetDryTransitionBehavior({
            dryForm: 'sand',
            wetForm: 'wet_sand',
            waterSources: ['water'],
            wettingChance: 0, // Don't auto-wet (handled by InteractionManager)
            dryingChance: 0, // Don't use probabilistic drying (use exposureTime instead)
            requiresExposure: false // We handle this manually
        }));
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // PRIORITY 1: Check water contact (stores isTouchingWater in cell.data)
        this.applyBehaviors(x, y, grid);

        // Initialize exposure tracking
        if (cell.data.exposureTime === undefined) {
            cell.data.exposureTime = 0;
        }

        // Check what's above this wet sand
        const above = grid.getElement(x, y - 1);
        const isExposedToAir = !above || above.id === 0;
        const isUnderWater = above && above.name === 'water';

        // DRYING LOGIC - time-based exposure (more realistic than probabilistic)
        // FIX: Also check if surrounded by wet_sand - don't dry if in a wet pile
        const neighbors = [
            grid.getElement(x - 1, y),
            grid.getElement(x + 1, y),
            grid.getElement(x, y + 1)
        ];
        const hasWetSandNeighbors = neighbors.some(n => n && n.name === 'wet_sand');

        if (isExposedToAir && !cell.data.isTouchingWater && !hasWetSandNeighbors) {
            // Exposed to air, not touching water, and isolated - start drying
            cell.data.exposureTime++;

            // Dry out after 600 frames (10 seconds) of air exposure
            if (cell.data.exposureTime > 600) {
                grid.setElement(x, y, grid.registry.get('sand'));
                return true;
            }
        } else {
            // Underwater, touching water, or in wet pile - stay wet, reset exposure
            cell.data.exposureTime = 0;
        }

        // PERMEABILITY - allow water to slowly seep through
        // Check if there's water above wanting to seep down
        if (isUnderWater) {
            const below = grid.getElement(x, y + 1);
            // If empty below, water can seep through (5% chance per frame)
            if (below && below.id === 0 && Math.random() > 0.95) {
                // Swap water down through the wet sand
                grid.swap(x, y - 1, x, y + 1);
                return true;
            }
        }

        // MOVEMENT - wet sand is VERY static, barely moves
        // Only fall straight down if there's nothing beneath (10% chance)
        if (grid.canMoveTo(x, y, x, y + 1)) {
            if (Math.random() > 0.9) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        // Almost NEVER slides diagonally (0.5% chance - super stable)
        if (Math.random() > 0.995) {
            const dir = Math.random() > 0.5 ? -1 : 1;
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
        }

        return false;
    }
}

export default WetSandElement;
