import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { GravityBehavior } from '../behaviors/MovementBehaviors.js';

class GrassSeedElement extends Element {
    constructor() {
        super(31, 'grass_seed', 0x9acd32, { // Yellow-green
            density: 1.5,
            state: STATE.SOLID,
            movable: true,
            tags: [TAG.ORGANIC],
            brushSize: 0,
            emissionDensity: 1.0
        });

        // Seeds fall like powder
        this.movement = new GravityBehavior({
            fallSpeed: 1,
            slideAngle: true,
            slideStability: 0.7
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize germination timer
        if (cell.data.germTimer === undefined) {
            cell.data.germTimer = 0;
        }

        // Check if seed has landed on valid ground
        const below = grid.getElement(x, y + 1);
        const grassSurfaces = ['sand', 'wet_sand', 'stone', 'wood', 'fossil', 'salt'];
        const hasValidGround = below && grassSurfaces.includes(below.name);

        if (hasValidGround) {
            // Germinate after 30 frames (0.5 seconds)
            cell.data.germTimer++;
            if (cell.data.germTimer >= 30) {
                // Check if there's water nearby (faster germination with water)
                let hasWater = false;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const neighbor = grid.getElement(x + dx, y + dy);
                        if (neighbor && neighbor.name === 'water') {
                            hasWater = true;
                            break;
                        }
                    }
                    if (hasWater) break;
                }

                // Germinate: turn into grass
                const germinateChance = hasWater ? 0.05 : 0.01; // 5% with water, 1% without
                if (Math.random() < germinateChance) {
                    grid.setElement(x, y, grid.registry.get('plant'));
                    return true;
                }
            }
        } else {
            // Try to fall if not on ground
            return this.movement.apply(x, y, grid);
        }

        return false;
    }
}

export default GrassSeedElement;
