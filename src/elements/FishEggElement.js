import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class FishEggElement extends Element {
    constructor() {
        super(30, 'fish_egg', 0xffd700, { // Golden/yellow color
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

    update(x, y, grid) {
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
            // Spawn 3-5 fish nearby
            const fishCount = 3 + Math.floor(Math.random() * 3); // 3-5 fish
            let spawned = 0;

            const spawnOffsets = [
                [0, 0], // Replace egg with first fish
                [0, -1], [0, 1], [-1, 0], [1, 0],
                [-1, -1], [1, -1], [-1, 1], [1, 1],
                [0, -2], [0, 2], [-2, 0], [2, 0]
            ];

            // Shuffle spawn positions
            spawnOffsets.sort(() => Math.random() - 0.5);

            for (const [dx, dy] of spawnOffsets) {
                if (spawned >= fishCount) break;

                const spawnX = x + dx;
                const spawnY = y + dy;
                const element = grid.getElement(spawnX, spawnY);

                // Spawn in water or replace egg
                if (element && (element.name === 'water' || (dx === 0 && dy === 0))) {
                    grid.setElement(spawnX, spawnY, grid.registry.get('fish'));
                    spawned++;
                }
            }

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
}

export default FishEggElement;
