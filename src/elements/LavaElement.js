import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';

class LavaElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.LAVA, 'lava', 0xff4500, { // Bright orange-red
            density: 8,
            state: STATE.LIQUID,
            movable: true,
            tags: new Set([TAG.HEAT_SOURCE, TAG.VERY_HOT]),
            brushSize: 3,
            emissionDensity: 0.7,
            lifetime: 18000 // Very slow cooling: 300 seconds (5 minutes) - nearly eternal
        });

        // Use standardized liquid flow behavior (very viscous)
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 2,
            dispersionRate: 1,
            viscosity: 2, // Very viscous
            levelingEnabled: false
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Slow natural cooling (5 minutes to harden into stone)
        // Use CellState for unified timer management
        const shouldSolidify = cell.state.incrementTimer('cooling', this.lifetime);
        if (shouldSolidify) {
            grid.setElement(x, y, grid.registry.get('stone'));
            return true;
        }

        // Lava does NOT melt stone - stone acts as a container for lava

        // Lava ignites combustible materials
        if (Math.random() > 0.8) {
            const neighbors = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            for (const [nx, ny] of neighbors) {
                const neighbor = grid.getElement(nx, ny);
                if (neighbor && neighbor.hasTag && neighbor.hasTag(TAG.COMBUSTIBLE)) {
                    const ignited = neighbor.burnsInto ? grid.registry.get(neighbor.burnsInto) : grid.registry.get('fire');
                    grid.setElement(nx, ny, ignited);
                    return true;
                }
            }
        }

        // Emit smoke above lava occasionally (10% -> 2%)
        if (Math.random() > 0.98) {
            if (grid.isEmpty(x, y - 1)) {
                grid.setElement(x, y - 1, grid.registry.get('smoke'));
            }
        }

        // Delegate to standardized liquid flow behavior
        // Note: LiquidFlowBehavior respects density and will only displace lighter elements
        return this.movement.apply(x, y, grid);
    }
}

export default LavaElement;
