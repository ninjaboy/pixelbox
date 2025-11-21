import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import {
    HeatTransformationBehavior,
    FreezingPropagationBehavior
} from '../behaviors/TransformationBehaviors.js';

class IceElement extends Element {
    constructor() {
        super(18, 'ice', 0x87ceeb, { // Sky blue
            density: 1.8, // Less dense than water (2) so it floats!
            state: STATE.SOLID,
            movable: true, // Can float/move in water
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

        // Behavior 2: Freeze adjacent water (MUCH slower, more realistic)
        // Ice floats and freezes water from top down (like real ice)
        this.addBehavior(new FreezingPropagationBehavior({
            targetElement: 'water',
            freezeInto: 'ice',
            freezeChance: 0.0005, // 0.05% chance per frame (40x slower than before)
            checkDiagonals: false // Only cardinal directions
        }));
    }

    updateImpl(x, y, grid) {
        // PRIORITY 1: Apply behaviors (melting, freezing)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Ice physics - floats on water, falls in air
        const below = grid.getElement(x, y + 1);
        const above = grid.getElement(x, y - 1);

        // Fall through empty space
        if (below && below.id === 0) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Piled ice sinks in water (ice piles have weight)
        // If there's ice above us AND water below, sink slowly
        if (below && below.name === 'water' && above && above.name === 'ice') {
            // 30% chance to sink when piled
            if (Math.random() < 0.30) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        // Single ice block floats on water (ice is less dense than water: 1.8 < 2)
        // Water will naturally push ice up via density physics in canMoveTo
        if (below && below.name === 'water') {
            // Ice floats - water should move down, ice stays/moves up
            // But this is handled by water's movement logic
            return false;
        }

        // Fall through other liquids lighter than ice (oil: 1.5)
        if (below && below.state === 'liquid' && below.density < this.density) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        return false;
    }
}

export default IceElement;
