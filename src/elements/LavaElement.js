import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { IgnitionBehavior, EmissionBehavior } from '../behaviors/CombustionBehaviors.js';
import { MeltingBehavior } from '../behaviors/TransformationBehaviors.js';
import { LavaSandInteractionBehavior, LavaWaterInteractionBehavior } from '../behaviors/ElementInteractionBehaviors.js';

class LavaElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.LAVA, 'lava', 0xff4500, { // Bright orange-red
            density: 8,
            state: STATE.LIQUID,
            movable: true,
            tags: new Set([TAG.HEAT_SOURCE, TAG.VERY_HOT]),
            brushSize: 3,
            emissionDensity: 0.7,
            lifetime: -1 // Eternal - lava never disappears
        });

        // Behavior 1: Ignite combustible materials nearby
        this.addBehavior(new IgnitionBehavior({
            ignitionChance: 0.2, // 20% chance
            range: 1,
            checkDiagonals: false // only cardinal directions
        }));

        // Behavior 2: Sand interaction (dries wet sand, pushes/glassifies dry sand)
        this.addBehavior(new LavaSandInteractionBehavior({
            pushDownChance: 0.7,
            glassifyBelowChance: 0.3,
            glassifySideChance: 0.08,
            pushSideChance: 0.15,
            dryWetSandChance: 0.6 // NEW: Dry wet sand before burning through
        }));

        // Behavior 3: Water interaction (create obsidian on sides, evaporate)
        this.addBehavior(new LavaWaterInteractionBehavior({
            obsidianSideChance: 0.3, // Form obsidian barriers on sides
            evaporateWaterChance: 0.2 // Evaporate water on contact
        }));

        // Behavior 4: Melting behavior (ice, salt)
        this.addBehavior(new MeltingBehavior({
            meltingRules: [
                { target: 'ice', result: 'steam', chance: 0.3 },
                { target: 'salt', result: 'smoke', chance: 0.1 }
            ],
            checkBelow: true,
            checkDiagonals: true,
            checkCardinal: true
        }));

        // Behavior 5: Smoke emission
        this.addBehavior(new EmissionBehavior({
            emitElement: 'smoke',
            emissionRate: 0.02, // 2% chance
            directions: [[0, -1]] // emit upward
        }));

        // Use standardized liquid flow behavior (very viscous)
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 2,
            dispersionRate: 1,
            viscosity: 2, // Very viscous
            levelingEnabled: false
        });
    }

    updateImpl(x, y, grid) {
        // Apply all behaviors (sand, water, ignition, melting, smoke)
        const behaviorResult = this.applyBehaviors(x, y, grid);
        if (behaviorResult) return true;

        // Then apply movement
        return this.movement.apply(x, y, grid);
    }
}

export default LavaElement;
