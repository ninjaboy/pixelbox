import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { BurningBehavior, EmissionBehavior } from '../behaviors/CombustionBehaviors.js';

class BurningWoodElement extends Element {
    constructor() {
        super(9, 'burning_wood', 0xff4500, { // Orange-red color for burning wood
            density: 5,
            state: STATE.SOLID,
            movable: false,
            lifetime: 900, // Burns for 900 frames (15 seconds at 60fps) - much slower!
            ignitionResistance: 0.95, // Very hard to re-ignite (mostly stays as burning wood)
            burnsInto: 'fire', // If re-ignited, becomes fire (shouldn't happen often)
            tags: [TAG.HEAT_SOURCE, TAG.COMBUSTIBLE] // Can spread fire AND still burn
        });

        // Behavior 1: Fire spreading to adjacent combustibles
        this.addBehavior(new BurningBehavior({
            lifetime: 900,
            spreadChance: 0.15, // 15% chance per frame to spread
            spreadIntensity: 1.0,
            burnsInto: 'ash'
        }));

        // Behavior 2: Fire emission upward (staged by burn progress)
        this.addBehavior(new EmissionBehavior({
            emitElement: 'fire',
            emissionRate: 0.15, // base rate
            directions: [[0, -1]], // emit upward
            stages: [
                { until: 0.33, rate: 0.15 }, // early burn
                { until: 0.66, rate: 0.20 }, // peak burn
                { until: 1.0, rate: 0.07 }   // late burn (dying down)
            ]
        }));

        // Behavior 3: Smoke emission (lighter, offset to sides)
        this.addBehavior(new EmissionBehavior({
            emitElement: 'smoke',
            emissionRate: 0.01, // base rate
            directions: [[-1, -1], [1, -1]], // emit upward-left or upward-right
            stages: [
                { until: 0.33, rate: 0.01 }, // early burn - minimal smoke
                { until: 0.66, rate: 0.02 }, // peak burn - more smoke
                { until: 1.0, rate: 0.03 }   // late burn - most smoke
            ]
        }));
    }

    updateImpl(x, y, grid) {
        // Use behavior composition pattern
        return this.applyBehaviors(x, y, grid);
    }
}

export default BurningWoodElement;
