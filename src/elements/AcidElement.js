import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';

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

        // Use standardized liquid flow behavior
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 3,
            dispersionRate: 1,
            viscosity: 0,
            levelingEnabled: false
        });
    }

    update(x, y, grid) {
        // Acid dissolves adjacent materials
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        // Try to dissolve something (15% chance per frame)
        if (Math.random() > 0.85) {
            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);

                // Acid dissolves most organic and some inorganic materials
                if (neighbor) {
                    const dissolvableElements = [
                        'wood', 'leaf', 'tree_branch', 'tree_trunk', 'tree_seed',
                        'ash', 'sand', 'dirt', 'stone', 'salt',
                        'burning_wood', 'fish'
                    ];

                    if (dissolvableElements.includes(neighbor.name)) {
                        // Dissolve the material (replace with smoke)
                        grid.setElement(nx, ny, grid.registry.get('smoke'));

                        // Acid gets diluted (5% chance to turn into water)
                        if (Math.random() > 0.95) {
                            grid.setElement(x, y, grid.registry.get('water'));
                        }
                        return true;
                    }
                }
            }
        }

        // Acid neutralizes when mixed with water (becomes diluted)
        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                // 5% chance to neutralize into water
                if (Math.random() > 0.95) {
                    grid.setElement(x, y, grid.registry.get('water'));
                    return true;
                }
            }
        }

        // Delegate to standardized liquid flow behavior
        return this.movement.apply(x, y, grid);
    }
}

export default AcidElement;
