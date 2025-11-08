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

        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        // Check for interactions with adjacent elements
        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);
            if (!neighbor || neighbor.id === 0) continue;

            // Water + Lava = Violent steam explosion + cool lava to stone
            if (neighbor.name === 'water') {
                if (Math.random() > 0.7) { // 30% chance per frame
                    // Create steam explosion (multiple steam particles)
                    grid.setElement(nx, ny, grid.registry.get('steam'));
                    if (grid.isEmpty(nx, ny - 1)) {
                        grid.setElement(nx, ny - 1, grid.registry.get('steam'));
                    }
                    // Lava cools rapidly when touching water
                    if (Math.random() > 0.5) {
                        grid.setElement(x, y, grid.registry.get('stone'));
                        return true;
                    }
                    return true;
                }
            }

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

        // Delegate to standardized liquid flow behavior
        // Note: LiquidFlowBehavior respects density and will only displace lighter elements
        return this.movement.apply(x, y, grid);
    }
}

export default LavaElement;
