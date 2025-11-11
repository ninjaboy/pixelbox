import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { GravityBehavior } from '../behaviors/MovementBehaviors.js';
import { WetDryTransitionBehavior } from '../behaviors/TransformationBehaviors.js';

class WetGunpowderElement extends Element {
    constructor() {
        super(19, 'wet_gunpowder', 0x2a2a1a, {
            density: 4,  // Heavy when wet
            state: STATE.POWDER,
            movable: true,
            ignitionResistance: 0.95,  // Very hard to ignite but possible
            burnsInto: 'fire',
            tags: [TAG.COMBUSTIBLE],  // Can burn, but slowly
            brushSize: 0,
            emissionDensity: 0
        });

        // Behavior 1: Wet/dry transition (shared with regular gunpowder)
        this.addBehavior(new WetDryTransitionBehavior({
            dryForm: 'gunpowder',
            wetForm: 'wet_gunpowder',
            waterSources: ['water', 'wet_sand'],
            wettingChance: 1.0, // Stay wet when touching water
            dryingChance: 0.0005 // Slow drying (0.05%)
        }));

        // Use standardized gravity behavior (heavy when wet)
        this.movement = new GravityBehavior({
            fallSpeed: 1,
            slideAngle: true,
            slideStability: 0.85
        });
    }

    update(x, y, grid) {
        // PRIORITY 1: Check for wet/dry transition (stores isTouchingWater in cell.data)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Delegate to gravity behavior
        return this.movement.apply(x, y, grid);
    }

    // Custom interaction to handle burning
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        const cell = grid.getCell(x, y);

        // Check if touching a heat source
        if (otherElement.hasTag && otherElement.hasTag(TAG.HEAT_SOURCE)) {
            // Wet gunpowder burns slowly (3% chance per frame)
            // Lower chance if touching water (1% chance)
            const burnChance = (cell && cell.data.isTouchingWater) ? 0.01 : 0.03;

            if (Math.random() < burnChance) {
                const fireElement = grid.registry.get('fire');
                if (fireElement) {
                    grid.setElement(x, y, fireElement);
                    return true; // Interaction handled
                }
            }

            // Even if it doesn't ignite, return true to prevent default interaction
            return true;
        }

        // Let other interactions proceed normally
        return null;
    }
}

export default WetGunpowderElement;
