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
            lifetime: -1 // Eternal - lava never disappears
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

        // Lava is eternal - no cooling timer!
        // Water-lava interaction handled by InteractionManager (forms crust on top)

        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        // Check for interactions with adjacent elements
        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (!neighbor || neighbor.id === 0) continue;

            // Water-lava interaction now handled by InteractionManager (priority 0)
            // Removed duplicate code to avoid conflicts

            // Ice + Lava = Melt ice instantly to water, then evaporate
            if (neighbor.name === 'ice') {
                if (Math.random() > 0.8) { // 20% chance
                    grid.setElement(nx, ny, grid.registry.get('steam'));
                    return true;
                }
            }

            // Sand + Lava = Melt sand into glass (realistic!)
            if (neighbor.name === 'sand') {
                if (Math.random() > 0.95) { // 5% chance - slow transformation
                    grid.setElement(nx, ny, grid.registry.get('glass'));
                    return true;
                }
            }

            // Salt + Lava = Dissolve/vaporize
            if (neighbor.name === 'salt') {
                if (Math.random() > 0.9) { // 10% chance
                    grid.setElement(nx, ny, grid.registry.get('smoke'));
                    return true;
                }
            }

            // Ignite combustible materials
            if (neighbor.hasTag && neighbor.hasTag(TAG.COMBUSTIBLE)) {
                if (Math.random() > 0.8) { // 20% chance
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

        // Before moving, check what we're about to displace
        // Lava should melt/transform materials it flows through
        const below = grid.getElement(x, y + 1);
        if (below && below.name === 'sand') {
            // Lava flowing into sand: mostly melts to glass, sometimes solidifies lava to stone
            if (Math.random() > 0.3) { // 70% chance
                grid.setElement(x, y + 1, grid.registry.get('glass')); // Melt sand to glass
            } else {
                grid.setElement(x, y + 1, grid.registry.get('stone')); // Sand cools lava to stone
            }
            return true;
        }

        // Check diagonal positions too (lava flowing diagonally)
        const belowLeft = grid.getElement(x - 1, y + 1);
        const belowRight = grid.getElement(x + 1, y + 1);

        if (belowLeft && belowLeft.name === 'sand' && Math.random() > 0.5) {
            if (Math.random() > 0.3) {
                grid.setElement(x - 1, y + 1, grid.registry.get('glass'));
            } else {
                grid.setElement(x - 1, y + 1, grid.registry.get('stone'));
            }
            return true;
        }

        if (belowRight && belowRight.name === 'sand' && Math.random() > 0.5) {
            if (Math.random() > 0.3) {
                grid.setElement(x + 1, y + 1, grid.registry.get('glass'));
            } else {
                grid.setElement(x + 1, y + 1, grid.registry.get('stone'));
            }
            return true;
        }

        // Delegate to standardized liquid flow behavior
        // Note: LiquidFlowBehavior respects density and will only displace lighter elements
        return this.movement.apply(x, y, grid);
    }
}

export default LavaElement;
