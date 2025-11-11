import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { CorrosionBehavior } from '../behaviors/TransformationBehaviors.js';

class AcidElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.ACID, 'acid', 0x7fff00, { // Bright yellow-green
            density: 1.2, // Slightly denser than water
            state: STATE.LIQUID,
            movable: true,
            tags: new Set([TAG.CORROSIVE]),
            brushSize: 2,
            emissionDensity: 0.6
        });

        // Behavior 1: Corrosion - dissolves materials using tag-based system
        this.addBehavior(new CorrosionBehavior({
            corrosionRules: [
                // Organic materials dissolve easily
                { tag: TAG.ORGANIC, chance: 0.15, result: 'smoke' },
                // Minerals dissolve slower
                { tag: TAG.MINERAL, chance: 0.10, result: 'smoke' },
                // Specific elements
                { target: 'fish', chance: 0.15, result: 'smoke' },
                { target: 'ash', chance: 0.15, result: 'smoke' }
            ],
            emitByproduct: 'smoke',
            byproductChance: 0.05,
            selfDilutionChance: 0.05, // 5% chance to dilute to water when corroding
            selfDilutionResult: 'water',
            checkDiagonals: false // Only cardinal directions
        }));

        // Use standardized liquid flow behavior
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 3,
            dispersionRate: 1,
            viscosity: 0,
            levelingEnabled: false
        });
    }

    updateImpl(x, y, grid) {
        // PRIORITY 1: Apply corrosion behavior (dissolves materials)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Water neutralization (separate from corrosion)
        // Acid neutralizes when mixed with water (becomes diluted)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // 5% chance to neutralize into water
                if (Math.random() < 0.05) {
                    grid.setElement(x, y, grid.registry.get('water'));
                    return true;
                }
            }
        }

        // PRIORITY 3: Delegate to standardized liquid flow behavior
        return this.movement.apply(x, y, grid);
    }
}

export default AcidElement;
