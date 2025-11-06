import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class FishElement extends Element {
    constructor() {
        // Randomize color: 70% black fish, 30% golden fish
        const isGolden = Math.random() > 0.7;
        const color = isGolden ? 0xffd700 : 0x1a1a1a; // Golden or black

        super(17, 'fish', color, {
            density: 2.5, // Denser than water (2.0) so water can't push fish around
            state: STATE.SOLID,
            movable: true,
            ignitionResistance: 0.0, // Burns easily
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 0, // Single pixel placement
            emissionDensity: 0.2 // 20% chance = 1-2 fish per click
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize fish data
        if (!cell.data.swimDirection) {
            cell.data.swimDirection = Math.random() > 0.5 ? 1 : -1;
            cell.data.swimTimer = 0;
            cell.data.outOfWaterTime = 0;
        }

        // Check if in water
        const inWater = this.isInWater(x, y, grid);

        if (!inWater) {
            // Out of water - dying!
            cell.data.outOfWaterTime++;

            // Die after 60 frames (1 second) out of water
            if (cell.data.outOfWaterTime > 60) {
                // Turn into ash (dried fish)
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }

            // Flop around on land (minimal movement)
            if (Math.random() > 0.95) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const newX = x + dir;
                if (grid.isEmpty(newX, y)) {
                    grid.swap(x, y, newX, y);
                    return true;
                }
            }

            return false;
        }

        // In water - reset death timer
        cell.data.outOfWaterTime = 0;

        // Check for nearby fish and occasionally kill each other (keep population scarce)
        if (Math.random() > 0.995) { // 0.5% chance per frame
            const nearbyFish = this.findNearbyFish(x, y, grid);
            if (nearbyFish) {
                // Kill the other fish
                grid.setElement(nearbyFish[0], nearbyFish[1], grid.registry.get('ash'));
                return true;
            }
        }

        // Swimming behavior
        cell.data.swimTimer++;

        // Change direction occasionally
        if (cell.data.swimTimer > 30 && Math.random() > 0.95) {
            cell.data.swimDirection *= -1;
            cell.data.swimTimer = 0;
        }

        // Swim through water (25% movement chance - slower swimming)
        if (Math.random() > 0.75) {
            const dir = cell.data.swimDirection;

            // Try to swim horizontally (reduced probability - 30% of movement attempts)
            if (Math.random() > 0.7) {
                const newX = x + dir;
                const targetElement = grid.getElement(newX, y);
                if (targetElement && targetElement.name === 'water') {
                    grid.swap(x, y, newX, y);
                    return true;
                }
            }

            // Try to swim diagonally (prefer downward - 80% down, 20% up)
            if (Math.random() > 0.7) {
                const verticalDir = Math.random() > 0.2 ? 1 : -1;
                const newX = x + dir;
                const newY = y + verticalDir;
                const targetElement = grid.getElement(newX, newY);
                if (targetElement && targetElement.name === 'water') {
                    grid.swap(x, y, newX, newY);
                    return true;
                }
            }

            // Try vertical swimming (40% chance - 85% down, 15% up)
            if (Math.random() > 0.6) {
                const verticalDir = Math.random() > 0.15 ? 1 : -1;
                const newY = y + verticalDir;
                const targetElement = grid.getElement(x, newY);
                if (targetElement && targetElement.name === 'water') {
                    grid.swap(x, y, x, newY);
                    return true;
                }
            }
        }

        return false;
    }

    findNearbyFish(x, y, grid) {
        // Check adjacent cells for other fish
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const element = grid.getElement(nx, ny);
            if (element && element.name === 'fish') {
                return [nx, ny];
            }
        }

        return null;
    }

    isInWater(x, y, grid) {
        // Check if fish is surrounded by water (at least one adjacent water)
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

    isWater(x, y, grid) {
        const element = grid.getElement(x, y);
        return element && element.name === 'water';
    }
}

export default FishElement;
