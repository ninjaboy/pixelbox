import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import {
    HeatTransformationBehavior,
    FreezingPropagationBehavior,
    ConditionalTransformationBehavior
} from '../behaviors/TransformationBehaviors.js';

class IceElement extends Element {
    constructor() {
        super(18, 'ice', 0x87ceeb, { // Sky blue
            density: 3,
            state: STATE.SOLID,
            movable: false,
            tags: [TAG.ORGANIC],
            brushSize: 1,
            emissionDensity: 0.8
        });

        // Behavior 1: Melt when near heat sources
        this.addBehavior(new HeatTransformationBehavior({
            transformInto: 'water',
            transformChance: 0.05, // 5% chance per frame
            requiredTag: TAG.HEAT_SOURCE,
            checkDiagonals: false // only cardinal directions
        }));

        // Behavior 2: Slow melting at normal temperature
        this.addBehavior(new ConditionalTransformationBehavior({
            condition: () => true, // always melting (just slowly)
            transformInto: 'water',
            transformChance: 0.001 // 0.1% per frame - very slow
        }));

        // Behavior 3: Freeze adjacent water
        this.addBehavior(new FreezingPropagationBehavior({
            targetElement: 'water',
            freezeInto: 'ice',
            freezeChance: 0.02, // 2% chance per frame
            checkDiagonals: false
        }));
    }

    update(x, y, grid) {
        // Use behavior composition pattern
        return this.applyBehaviors(x, y, grid);
    }
}

export default IceElement;
