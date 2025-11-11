import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { IgnitionBehavior, EmissionBehavior } from '../behaviors/CombustionBehaviors.js';
import { MeltingBehavior } from '../behaviors/TransformationBehaviors.js';

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

        // Behavior 2: Melting/transformation behavior (ice, sand, salt, water)
        this.addBehavior(new MeltingBehavior({
            meltingRules: [
                { target: 'water', result: 'obsidian', chance: 0.8 }, // Lava + water = obsidian (like Minecraft!)
                { target: 'ice', result: 'steam', chance: 0.2 },
                { target: 'sand', result: ['glass', 'glass', 'glass', 'stone'], chance: 0.05 }, // 75% glass, 25% stone
                { target: 'salt', result: 'smoke', chance: 0.1 }
            ],
            checkBelow: true,
            checkDiagonals: true,
            checkCardinal: true
        }));

        // Behavior 3: Smoke emission
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

    update(x, y, grid) {
        // Apply all behaviors first
        const behaviorResult = this.applyBehaviors(x, y, grid);
        if (behaviorResult) return true;

        // Then apply movement
        return this.movement.apply(x, y, grid);
    }
}

export default LavaElement;
