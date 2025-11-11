import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { BurningBehavior, EmissionBehavior } from '../behaviors/CombustionBehaviors.js';

class BurningCoalElement extends Element {
    constructor() {
        super(30, 'burning_coal', 0xff4500, { // Orange-red hot coal
            density: 5,
            state: STATE.SOLID,
            movable: false,
            tags: [TAG.HEAT_SOURCE, TAG.VERY_HOT],
            brushSize: 0, // Don't place directly
            emissionDensity: 0
        });

        // Behavior 1: Burn longer than wood but not forever (1800 frames = 30 seconds vs 50 for wood)
        // Burns slower but hotter
        this.addBehavior(new BurningBehavior({
            lifetime: 1800, // Burns for 30 seconds (still much longer than wood's 50s)
            spreadChance: 0.10, // Less spreading than wood
            burnsInto: 'ash'
        }));

        // Behavior 2: Emit more intense fire (hotter burn)
        // Coal produces steady, intense heat
        this.addBehavior(new EmissionBehavior({
            emitElement: 'fire',
            emissionRate: 0.25, // More fire emission than wood (0.15)
            stages: [
                { until: 0.2, rate: 0.30 },  // Early: intense ignition
                { until: 0.8, rate: 0.25 },  // Mid: steady hot burn
                { until: 1.0, rate: 0.10 }   // Late: dying embers
            ],
            directions: [[0, -1], [-1, -1], [1, -1]] // Fire goes up and diagonal
        }));

        // Behavior 3: Emit occasional smoke (less than wood since it burns cleaner)
        this.addBehavior(new EmissionBehavior({
            emitElement: 'smoke',
            emissionRate: 0.08, // Less smoke than wood (0.12)
            directions: [[0, -1]]
        }));
    }

    update(x, y, grid) {
        // PRIORITY 1: Check for water contact - extinguish burning coal
        const neighbors = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // Water extinguishes burning coal -> back to regular coal
                grid.setElement(x, y, grid.registry.get('coal'));
                // Water becomes steam (50% chance)
                if (Math.random() < 0.5) {
                    grid.setElement(nx, ny, grid.registry.get('steam'));
                }
                return true;
            }
        }

        // PRIORITY 2: Use behavior composition pattern (burning, emissions)
        return this.applyBehaviors(x, y, grid);
    }
}

export default BurningCoalElement;
