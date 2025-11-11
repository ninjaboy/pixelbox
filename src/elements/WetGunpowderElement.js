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
            ignitionResistance: 0.80,  // Hard to ignite (3% base chance = 15% * 0.20)
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

    // Note: Ignition is handled by InteractionManager (priority 5)
    // TAG.COMBUSTIBLE + TAG.HEAT_SOURCE with ignitionResistance: 0.80
    // This gives 3% base chance (15% * 0.20), making wet gunpowder hard to ignite
}

export default WetGunpowderElement;
