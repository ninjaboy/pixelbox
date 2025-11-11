import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class PlayerElement extends Element {
    constructor() {
        super(20, 'player', 0x00ffff, { // Bright cyan for visibility
            density: 3.0, // Heavy enough to not be pushed around easily
            state: STATE.SOLID,
            movable: false, // Player controls their own movement
            ignitionResistance: 1.0, // Can't burn
            tags: [],
            brushSize: 0 // Single pixel placement
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize player data
        if (!cell.data.initialized) {
            cell.data.initialized = true;
            cell.data.velocityY = 0;
            cell.data.isOnGround = false;
        }

        // SMOOTH GRAVITY AND JUMP PHYSICS
        const below = grid.getElement(x, y + 1);
        if (below && (below.name === 'empty' || below.name === 'water')) {
            // Apply gravity with smooth acceleration
            cell.data.velocityY = Math.min(cell.data.velocityY + 0.3, 2); // Slower gravity for smoother jumps

            // Handle upward velocity (jump arc)
            if (cell.data.velocityY < 0) {
                // Moving upward - check if we can move up
                const moveUp = Math.ceil(Math.abs(cell.data.velocityY));
                const targetY = y - moveUp;
                const targetElement = grid.getElement(x, targetY);

                if (targetElement && (targetElement.name === 'empty' || targetElement.name === 'water')) {
                    grid.swap(x, y, x, targetY);
                    cell.data.isOnGround = false;
                    return true;
                } else {
                    // Hit ceiling, stop upward motion
                    cell.data.velocityY = 0;
                }
            } else if (cell.data.velocityY > 0) {
                // Moving downward
                const fallDistance = Math.floor(cell.data.velocityY);
                if (fallDistance > 0) {
                    const targetY = y + fallDistance;
                    const targetElement = grid.getElement(x, targetY);

                    if (targetElement && (targetElement.name === 'empty' || targetElement.name === 'water')) {
                        grid.swap(x, y, x, targetY);
                        cell.data.isOnGround = false;
                        return true;
                    } else {
                        // Hit something, try to fall 1 pixel
                        const oneDown = grid.getElement(x, y + 1);
                        if (oneDown && (oneDown.name === 'empty' || oneDown.name === 'water')) {
                            grid.swap(x, y, x, y + 1);
                            cell.data.isOnGround = false;
                            return true;
                        }
                    }
                }
            }
        } else {
            // On ground
            cell.data.velocityY = 0;
            cell.data.isOnGround = true;
        }

        return false;
    }

    // Method called by main.js for player movement
    handleMovement(x, y, grid, direction) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        switch (direction) {
            case 'left':
                return this.moveHorizontal(x, y, grid, -1);
            case 'right':
                return this.moveHorizontal(x, y, grid, 1);
            case 'jump':
                return this.jump(x, y, grid);
            default:
                return false;
        }
    }

    moveHorizontal(x, y, grid, dir) {
        const targetX = x + dir;
        const targetElement = grid.getElement(targetX, y);

        if (targetElement && (targetElement.name === 'empty' || targetElement.name === 'water')) {
            // Can walk into empty space or water
            grid.swap(x, y, targetX, y);
            return true;
        }

        // Check if we can climb up 1 pixel (step up)
        const aboveTarget = grid.getElement(targetX, y - 1);
        if (aboveTarget && (aboveTarget.name === 'empty' || aboveTarget.name === 'water')) {
            grid.swap(x, y, targetX, y - 1);
            return true;
        }

        return false;
    }

    jump(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell || !cell.data.isOnGround) return false;

        // Set strong upward velocity for higher jump
        cell.data.velocityY = -2.5; // Stronger upward velocity for 5-6 pixel jump
        cell.data.isOnGround = false;

        // Immediately move up 1 pixel to start jump
        const targetElement = grid.getElement(x, y - 1);
        if (targetElement && (targetElement.name === 'empty' || targetElement.name === 'water')) {
            grid.swap(x, y, x, y - 1);
            return true;
        }

        return false;
    }
}

export default PlayerElement;
