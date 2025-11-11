import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { HeatTransformationBehavior } from '../behaviors/TransformationBehaviors.js';

class SlushElement extends Element {
    constructor() {
        super(32, 'slush', 0xb0e0e6, { // Powder blue - between snow white and ice blue
            density: 1.9, // Heavier than ice (1.8) but lighter than water (2)
            state: STATE.LIQUID,
            movable: true,
            tags: new Set([TAG.FREEZING]),
            brushSize: 3,
            emissionDensity: 0.7
        });

        // Behavior 1: Melts into water when near heat
        this.addBehavior(new HeatTransformationBehavior({
            transformInto: 'water',
            transformChance: 0.1, // Melts fairly quickly
            requiredTag: TAG.HEAT_SOURCE,
            checkDiagonals: true
        }));

        // Use liquid flow behavior with high viscosity (thick, sludgy)
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 2, // Falls slower than water (4)
            dispersionRate: 1, // Spreads slowly
            viscosity: 0.7, // Very viscous/thick
            levelingEnabled: true
        });
    }

    update(x, y, grid) {
        // PRIORITY 1: Apply behaviors (melting from heat)
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Slow freezing to ice when exposed to cold air (not touching water)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        let touchingWater = false;
        let exposedToAir = false;

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (neighbor && neighbor.name === 'water') {
                touchingWater = true;
            }
            if (!neighbor || neighbor.id === 0) {
                exposedToAir = true;
            }
        }

        // If exposed to cold air (not touching water), slowly freeze back to ice
        if (exposedToAir && !touchingWater && Math.random() < 0.002) {
            grid.setElement(x, y, grid.registry.get('ice'));
            return true;
        }

        // PRIORITY 3: Liquid flow behavior (thick and slow)
        return this.movement.apply(x, y, grid);
    }
}

export default SlushElement;
