import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { BurningBehavior, EmissionBehavior, WaterExtinguishBehavior } from '../behaviors/CombustionBehaviors.js';

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

        // Behavior 4: Water extinguishes burning coal back to regular coal
        this.addBehavior(new WaterExtinguishBehavior({
            extinguishesTo: 'coal', // Becomes regular coal (not ash)
            waterToSteamChance: 0.5,
            extinguishChance: 1.0,
            waterSources: ['water']
        }));
    }

    update(x, y, grid) {
        // All behaviors handled via composition:
        // 1. Water extinguishing (via WaterExtinguishBehavior)
        // 2. Burning countdown (via BurningBehavior)
        // 3. Fire emission (via EmissionBehavior)
        // 4. Smoke emission (via EmissionBehavior)
        return this.applyBehaviors(x, y, grid);
    }
}

export default BurningCoalElement;
