import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import {
    HeatTransformationBehavior,
    FreezingPropagationBehavior
} from '../behaviors/TransformationBehaviors.js';

class IceElement extends Element {
    constructor() {
        super(18, 'ice', 0x87ceeb, { // Sky blue
            density: 3,
            state: STATE.SOLID,
            movable: false,
            tags: new Set([TAG.FREEZING]), // Ice is freezing, not organic
            brushSize: 1,
            emissionDensity: 0.8
        });

        // Behavior 1: Melt when near heat sources
        this.addBehavior(new HeatTransformationBehavior({
            transformInto: 'water',
            transformChance: 0.05, // 5% chance per frame when near heat
            requiredTag: TAG.HEAT_SOURCE,
            checkDiagonals: false // only cardinal directions
        }));

        // Behavior 2: Freeze adjacent water (spread the cold)
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
