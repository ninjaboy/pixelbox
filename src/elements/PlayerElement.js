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

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize player data
        if (!cell.data.initialized) {
            cell.data.initialized = true;
            cell.data.velocityY = 0;
            cell.data.isOnGround = false;
        }

        // GRAVITY: Fall when not on ground
        const below = grid.getElement(x, y + 1);
        if (below && (below.name === 'empty' || below.name === 'water')) {
            // Apply gravity
            cell.data.velocityY = Math.min(cell.data.velocityY + 0.5, 3); // Max fall speed
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

        // Jump up 3 pixels
        for (let jumpHeight = 3; jumpHeight >= 1; jumpHeight--) {
            const targetY = y - jumpHeight;
            const targetElement = grid.getElement(x, targetY);

            if (targetElement && (targetElement.name === 'empty' || targetElement.name === 'water')) {
                grid.swap(x, y, x, targetY);
                cell.data.velocityY = -2; // Upward velocity
                cell.data.isOnGround = false;
                return true;
            }
        }

        return false;
    }
}

export default PlayerElement;
