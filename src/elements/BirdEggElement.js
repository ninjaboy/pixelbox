import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class BirdEggElement extends Element {
    constructor() {
        super(43, 'bird_egg', 0xffff99, { // Yellowish color (bird egg)
            density: 3, // Heavy enough to fall
            state: STATE.SOLID,
            movable: true,
            ignitionResistance: 0.0,
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 0,
            emissionDensity: 0
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize egg data
        if (cell.data.incubationTime === undefined) {
            cell.data.incubationTime = 0;
            cell.data.onGround = false;
        }

        // Check if egg is on a solid surface
        const onSolidSurface = this.isOnSolidSurface(x, y, grid);

        if (!onSolidSurface) {
            // Not on solid surface - fall down (gravity)
            const below = grid.getElement(x, y + 1);
            if (below && below.name === 'empty') {
                // Fall through air
                grid.swap(x, y, x, y + 1);
                return true;
            }

            // Can't fall further but not on solid surface (might be on water)
            // In this case, egg floats and won't hatch
            return false;
        }

        // On solid surface - mark as grounded and start incubation
        cell.data.onGround = true;

        // Increment incubation timer
        cell.data.incubationTime++;

        // Hatch after 600 frames (10 seconds) - same as fish
        if (cell.data.incubationTime > 600) {
            // STRICT POPULATION CONTROL: Check if area is overcrowded before hatching
            const nearbyBirdCount = this.countNearbyBirds(x, y, grid, 8);

            // If too crowded (>6 birds nearby in 8-pixel radius), egg dies without hatching
            if (nearbyBirdCount > 6) {
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }

            // SINGLE BIRD PER EGG: Each egg hatches into exactly 1 bird
            grid.setElement(x, y, grid.registry.get('bird'));
            return true;
        }

        return false;
    }

    isOnSolidSurface(x, y, grid) {
        // Check if there's a solid surface below
        const below = grid.getElement(x, y + 1);
        if (!below) return false;

        // List of surfaces that can support an egg
        const solidSurfaces = [
            'tree_trunk', 'tree_branch', 'wood', 'stone', 'wall',
            'sand', 'wet_sand', 'ash', 'fossil', 'coal', 'obsidian',
            'glass', 'ice', 'leaf' // Eggs can also sit on leaves
        ];

        return solidSurfaces.includes(below.name);
    }

    // Count nearby birds for population control
    countNearbyBirds(x, y, grid, radius) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'bird') {
                    count++;
                }
            }
        }
        return count;
    }
}

export default BirdEggElement;
