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

        // Behavior 1: Burn MUCH longer than wood (6000 frames = 100 seconds vs 50 for wood)
        // Burns slower but hotter
        this.addBehavior(new BurningBehavior({
            lifetime: 6000, // 2x longer than wood
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
        // Use behavior composition pattern
        return this.applyBehaviors(x, y, grid);
    }
}

export default BurningCoalElement;
