import Element from '../Element.js';
import { STATE, TEMPERATURE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { GasBehavior } from '../behaviors/MovementBehaviors.js';
import { EmissionBehavior } from '../behaviors/CombustionBehaviors.js';

class FireElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.FIRE, 'fire', 0xff6600, { // Vibrant orange-red for more intensity
            density: 0,
            state: STATE.GAS,
            temperature: TEMPERATURE.VERY_HOT,
            dispersion: 2,
            lifetime: 60, // Ephemeral flames - dissipate after 1 second
            tags: new Set([TAG.HEAT_SOURCE]),
            brushSize: 2, // Small controlled brush
            emissionDensity: 0.5, // Moderate sparse placement
            glowing: true // Mark as glowing for special rendering
        });

        // Behavior 1: Emit smoke upward and diagonally
        this.addBehavior(new EmissionBehavior({
            emitElement: 'smoke',
            emissionRate: 0.30, // 30% chance per frame
            directions: [[-1, -1], [1, -1]], // Diagonal smoke
            requiresEmpty: true
        }));

        // Use standardized gas behavior
        this.movement = new GasBehavior({
            riseSpeed: 0.7, // 70% chance to rise (chaotic flickering)
            spreadRate: 0.2, // 20% sideways dance
            dissipation: false // Lifetime system handles dissipation
        });
    }

    update(x, y, grid) {
        // PRIORITY 1: Emit smoke (via behavior)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Delegate to standardized gas behavior
        return this.movement.apply(x, y, grid);
    }
}

export default FireElement;
