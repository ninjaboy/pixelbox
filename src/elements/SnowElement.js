import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { HeatTransformationBehavior } from '../behaviors/TransformationBehaviors.js';

class SnowElement extends Element {
    constructor() {
        super(31, 'snow', 0xffffff, { // Pure white
            density: 1, // Very light, lighter than water
            state: STATE.POWDER,
            movable: true,
            tags: [TAG.FREEZING],
            brushSize: 3,
            emissionDensity: 0.6
        });

        // Melts when near heat sources
        this.addBehavior(new HeatTransformationBehavior({
            transformInto: 'water',
            transformChance: 0.15, // Melts faster than ice
            requiredTag: TAG.HEAT_SOURCE,
            checkDiagonals: true
        }));
    }

    updateImpl(x, y, grid) {
        // First check behaviors (melting from heat)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // SEASONAL MELTING (v4.0.8) - snow melts in spring/summer
        const seasonData = grid.seasonData;
        if (seasonData) {
            const season = seasonData.season;
            const seasonProgress = seasonData.seasonProgress || 0;

            // Snow melts progressively through spring, rapidly in summer
            let meltChance = 0;
            if (season === 'spring') {
                // Melt increases through spring: 0% at start → 2% at end
                meltChance = 0.0001 + (seasonProgress * 0.0002); // 0.01% to 0.03%
            } else if (season === 'summer') {
                // Rapid melting in summer
                meltChance = 0.005; // 0.5% per frame - snow gone quickly
            }

            if (meltChance > 0 && Math.random() < meltChance) {
                grid.setElement(x, y, grid.registry.get('water'));
                return true;
            }
        }

        // CHECK FOR WATER CONTACT: Snow forms slush when touching water
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // Snow touching water = forms slush (mixture of snow and water)
                if (Math.random() < 0.4) { // 40% chance per contact - slower than before
                    grid.setElement(x, y, grid.registry.get('slush'));
                    return true;
                }
            }
        }

        // SLOW FALLING: Only move 30% of the time (snow drifts down gently)
        if (Math.random() > 0.3) {
            return false;
        }

        // Priority 1: Fall straight down
        const below = grid.getElement(x, y + 1);

        // Can't fall onto water - forms slush on contact
        if (below && below.name === 'water') {
            // Snow landing on water surface forms slush
            grid.setElement(x, y, grid.registry.get('slush'));
            return true;
        }

        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Priority 2: Diagonal slide (like sand, but slower)
        // Snow piles up and slides down at angles
        const dir = Math.random() > 0.5 ? -1 : 1;

        // Only slide 50% of the time
        if (Math.random() > 0.5 && grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }

        // Priority 3: Accumulate and settle (no movement)
        return false;
    }
}

export default SnowElement;
