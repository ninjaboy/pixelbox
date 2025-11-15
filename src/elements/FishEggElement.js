import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class FishEggElement extends Element {
    constructor() {
        super(30, 'fish_egg', 0x9370db, { // Purple color
            density: 3, // Slightly heavier than water, lighter than fish
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
            cell.data.outOfWaterTime = 0;
        }

        // Check if in water
        const inWater = this.isInWater(x, y, grid);

        if (!inWater) {
            // Out of water - egg dies quickly
            cell.data.outOfWaterTime++;

            if (cell.data.outOfWaterTime > 180) { // 3 seconds out of water
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }

            // Fall down when in air (gravity)
            const below = grid.getElement(x, y + 1);
            if (below && below.name === 'empty') {
                grid.swap(x, y, x, y + 1);
                return true;
            }

            return false;
        }

        // In water - reset death timer
        cell.data.outOfWaterTime = 0;

        // Increment incubation timer
        cell.data.incubationTime++;

        // Hatch after 600 frames (10 seconds)
        if (cell.data.incubationTime > 600) {
            // STRICT POPULATION CONTROL: Check if area is overcrowded before hatching
            const nearbyFishCount = this.countNearbyFish(x, y, grid, 8); // Wider radius

            // If too crowded (>6 fish nearby in 8-pixel radius), egg dies without hatching
            if (nearbyFishCount > 6) {
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }

            // SINGLE FISH PER EGG: Each egg hatches into exactly 1 fish
            // This prevents population explosions
            grid.setElement(x, y, grid.registry.get('fish'));
            return true;
        }

        // Eggs sink slowly in water
        if (Math.random() > 0.8) { // 20% chance to sink
            const below = grid.getElement(x, y + 1);
            if (below && below.name === 'water') {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        return false;
    }

    isInWater(x, y, grid) {
        // Check if egg is touching water
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const element = grid.getElement(nx, ny);
            if (element && element.name === 'water') {
                return true;
            }
        }

        return false;
    }

    // Count nearby fish for population control
    countNearbyFish(x, y, grid, radius) {
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'fish') {
                    count++;
                }
            }
        }
        return count;
    }
}

export default FishEggElement;
