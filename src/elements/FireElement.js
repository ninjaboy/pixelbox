import Element from '../Element.js';
import { STATE, TEMPERATURE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { GasBehavior } from '../behaviors/MovementBehaviors.js';

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

        // Use standardized gas behavior
        this.movement = new GasBehavior({
            riseSpeed: 0.7, // 70% chance to rise (chaotic flickering)
            spreadRate: 0.2, // 20% sideways dance
            dissipation: false // Lifetime system handles dissipation
        });
    }

    update(x, y, grid) {
        // Emit smoke for visual effect when burning (30% chance)
        if (Math.random() > 0.7) {
            const smokeX = x + (Math.random() > 0.5 ? 1 : -1);
            const smokeY = y - 1;
            if (grid.isEmpty(smokeX, smokeY)) {
                grid.setElement(smokeX, smokeY, grid.registry.get('smoke'));
            }
        }

        // Delegate to standardized gas behavior
        return this.movement.apply(x, y, grid);
    }
}

export default FireElement;
