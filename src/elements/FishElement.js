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
            cell.data.isFishHead = true; // This pixel is the head
        }

        // Initialize tail if it doesn't exist
        if (cell.data.isFishHead && !this.hasTail(x, y, cell.data.swimDirection, grid)) {
            // Place tail opposite to swim direction
            const tailX = x - cell.data.swimDirection;
            if (grid.isEmpty(tailX, y)) {
                grid.setElement(tailX, y, this);
                const tailCell = grid.getCell(tailX, y);
                if (tailCell) {
                    tailCell.data.isFishHead = false;
                    tailCell.data.headX = x;
                    tailCell.data.swimDirection = cell.data.swimDirection;
                }
            }
        }

        // If this is a tail, don't update (only heads update)
        if (!cell.data.isFishHead) {
            return false;
        }

        // Check if in water
        const inWater = this.isInWater(x, y, grid);

        if (!inWater) {
            // Out of water - dying!
            cell.data.outOfWaterTime++;

            // Die after 60 frames (1 second) out of water
            if (cell.data.outOfWaterTime > 60) {
                // Turn into ash (dried fish) - both head and tail
                grid.setElement(x, y, grid.registry.get('ash'));
                const tailX = x - cell.data.swimDirection;
                const tailElement = grid.getElement(tailX, y);
                if (tailElement && tailElement.name === 'fish') {
                    grid.setElement(tailX, y, grid.registry.get('ash'));
                }
                return true;
            }

            // Flop around on land (minimal movement)
            if (Math.random() > 0.95) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const newX = x + dir;
                const oldTailX = x - cell.data.swimDirection;
                const newTailX = newX - cell.data.swimDirection;

                if (grid.isEmpty(newX, y) && grid.isEmpty(newTailX, y)) {
                    // Remove old tail
                    const oldTailElement = grid.getElement(oldTailX, y);
                    if (oldTailElement && oldTailElement.name === 'fish') {
                        grid.setElement(oldTailX, y, grid.registry.get('empty'));
                    }
                    // Move head
                    grid.swap(x, y, newX, y);
                    // Place new tail
                    grid.setElement(newTailX, y, this);
                    const tailCell = grid.getCell(newTailX, y);
                    if (tailCell) {
                        tailCell.data.isFishHead = false;
                        tailCell.data.headX = newX;
                        tailCell.data.swimDirection = cell.data.swimDirection;
                    }
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

        // Swim through water
        if (Math.random() > 0.75) { // 25% movement chance (slower swimming)
            const dir = cell.data.swimDirection;

            // Try to swim horizontally (reduced probability)
            if (Math.random() > 0.7) { // Only 30% of movement attempts go horizontal
                if (this.canMoveFish(x, y, x + dir, y, cell.data.swimDirection, grid)) {
                    this.moveFish(x, y, x + dir, y, cell.data.swimDirection, grid);
                    return true;
                }
            }

            // Try to swim diagonally (prefer downward for deep swimming)
            if (Math.random() > 0.7) {
                // 80% chance to swim down, 20% chance to swim up
                const verticalDir = Math.random() > 0.2 ? 1 : -1;
                if (this.canMoveFish(x, y, x + dir, y + verticalDir, cell.data.swimDirection, grid)) {
                    this.moveFish(x, y, x + dir, y + verticalDir, cell.data.swimDirection, grid);
                    return true;
                }
            }

            // Swim vertically sometimes (strongly prefer going down to swim deep)
            if (Math.random() > 0.6) { // Increased from 0.8 to 0.6 (40% chance for vertical)
                // 85% chance to swim down, 15% chance to swim up
                const verticalDir = Math.random() > 0.15 ? 1 : -1;
                if (this.canMoveFish(x, y, x, y + verticalDir, cell.data.swimDirection, grid)) {
                    this.moveFish(x, y, x, y + verticalDir, cell.data.swimDirection, grid);
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
        // Check if fish head or tail is surrounded by water (at least one adjacent water)
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check head position
        const headNeighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of headNeighbors) {
            if (this.isWater(nx, ny, grid)) {
                return true;
            }
        }

        // Also check tail position if this is a head
        if (cell.data.isFishHead && cell.data.swimDirection) {
            const tailX = x - cell.data.swimDirection;
            const tailNeighbors = [
                [tailX, y - 1], [tailX, y + 1], [tailX - 1, y], [tailX + 1, y]
            ];

            for (const [nx, ny] of tailNeighbors) {
                if (this.isWater(nx, ny, grid)) {
                    return true;
                }
            }
        }

        return false;
    }

    isWater(x, y, grid) {
        const element = grid.getElement(x, y);
        return element && element.name === 'water';
    }

    hasTail(headX, headY, swimDirection, grid) {
        const tailX = headX - swimDirection;
        const tailElement = grid.getElement(tailX, headY);
        return tailElement && tailElement.name === 'fish';
    }

    canMoveFish(oldX, oldY, newX, newY, swimDirection, grid) {
        // Check if new head position is water
        const newHeadElement = grid.getElement(newX, newY);
        if (!newHeadElement || newHeadElement.name !== 'water') {
            return false;
        }

        // Calculate new tail position
        const newTailX = newX - swimDirection;
        const newTailY = newY;

        // Check if new tail position is water or empty
        const newTailElement = grid.getElement(newTailX, newTailY);
        if (!newTailElement || (newTailElement.name !== 'water' && newTailElement.name !== 'empty')) {
            return false;
        }

        return true;
    }

    moveFish(oldX, oldY, newX, newY, swimDirection, grid) {
        const oldTailX = oldX - swimDirection;
        const oldTailY = oldY;
        const newTailX = newX - swimDirection;
        const newTailY = newY;

        // Remove old tail (turn it to water/empty)
        const oldTailElement = grid.getElement(oldTailX, oldTailY);
        if (oldTailElement && oldTailElement.name === 'fish') {
            grid.setElement(oldTailX, oldTailY, grid.registry.get('empty'));
        }

        // Move head
        grid.swap(oldX, oldY, newX, newY);

        // Place new tail
        grid.setElement(newTailX, newTailY, this);
        const tailCell = grid.getCell(newTailX, newTailY);
        if (tailCell) {
            tailCell.data.isFishHead = false;
            tailCell.data.headX = newX;
            tailCell.data.swimDirection = swimDirection;
        }
    }
}

export default FishElement;
