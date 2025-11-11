import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { ProximityIgnitionBehavior } from '../behaviors/CombustionBehaviors.js';

class OilElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.OIL, 'oil', 0x3d3d1a, {
            density: 1.5,              // Less dense than water (floats!)
            state: STATE.LIQUID,
            dispersion: 2,             // Doesn't spread as much as water
            ignitionResistance: 0.2,   // Easy to ignite (20% resistance = 12% ignition chance)
            tags: new Set([TAG.COMBUSTIBLE]),   // Will ignite near fire!
            burnsInto: 'fire',         // Becomes fire when ignited (burns fast!)
            brushSize: 5,              // Large pour brush
            emissionDensity: 1.0       // Continuous pour
        });

        // Behavior: Proximity ignition - oil ignites from nearby heat
        this.addBehavior(new ProximityIgnitionBehavior({
            detectionRange: 1,
            ignitionChance: 0.5, // 50% chance when near heat
            transformInto: 'fire',
            checkInterval: 20 // check every 20 frames (~5% of frames)
        }));

        // Use standardized liquid flow behavior (more viscous than water)
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 2,
            dispersionRate: 1,
            viscosity: 1, // More viscous than water
            levelingEnabled: false
        });
    }

    // Custom interaction for oil burning
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        // When oil touches fire
        if (otherElement.hasTag(TAG.HEAT_SOURCE)) {
            const rand = Math.random();

            // 40% chance to create fire above/beside the oil (surface burning)
            if (rand > 0.6) {
                // Try to create fire above this oil
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('fire'));
                    return true;
                }

                // Or to the sides
                const dir = Math.random() > 0.5 ? 1 : -1;
                if (grid.isEmpty(x + dir, y)) {
                    grid.setElement(x + dir, y, grid.registry.get('fire'));
                    return true;
                }
            }

            // 20% chance to actually convert to fire (was 10%)
            if (rand > 0.8) {
                grid.setElement(x, y, grid.registry.get('fire'));
                // Also emit smoke
                if (grid.isEmpty(x, y - 1)) {
                    grid.setElement(x, y - 1, grid.registry.get('smoke'));
                }
                return true;
            }

            return true; // Interaction occurred but oil stays
        }

        return null; // Use default interaction system
    }

    updateImpl(x, y, grid) {
        // Apply behaviors (proximity ignition)
        const behaviorResult = this.applyBehaviors(x, y, grid);
        if (behaviorResult) return true;

        // Delegate to standardized liquid flow behavior
        return this.movement.apply(x, y, grid);
    }
}

export default OilElement;
