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

        // PRIORITY 2: Extreme heat reaction (lava, fire)
        // Acid boils violently when touching extreme heat
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);

            // React with lava - violent boiling creates steam and smoke
            if (neighbor && neighbor.name === 'lava') {
                // 30% chance - faster reaction than water neutralization
                if (Math.random() < 0.3) {
                    // Acid boils off to steam
                    grid.setElement(x, y, grid.registry.get('steam'));
                    // Create toxic smoke as byproduct
                    if (Math.random() < 0.5) {
                        const aboveAcid = grid.getElement(x, y - 1);
                        if (aboveAcid && aboveAcid.id === 0) {
                            grid.setElement(x, y - 1, grid.registry.get('smoke'));
                        }
                    }
                    return true;
                }
            }

            // React with fire - acid evaporates
            if (neighbor && neighbor.name === 'fire') {
                // 20% chance to evaporate
                if (Math.random() < 0.2) {
                    grid.setElement(x, y, grid.registry.get('steam'));
                    return true;
                }
            }
        }

        // PRIORITY 3: Water neutralization (separate from corrosion)
        // Acid neutralizes when mixed with water (becomes diluted)
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

        // PRIORITY 4: Delegate to standardized liquid flow behavior
        return this.movement.apply(x, y, grid);
    }
}

export default AcidElement;
