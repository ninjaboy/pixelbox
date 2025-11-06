// Pixel Grid Class - manages the particle simulation with element objects
class PixelGrid {
    constructor(width, height, pixelSize, registry) {
        this.width = Math.floor(width / pixelSize);
        this.height = Math.floor(height / pixelSize);
        this.pixelSize = pixelSize;
        this.registry = registry;
        this.grid = [];
        this.particleCount = 0;
        this.frameCount = 0; // Track frames for alternating scan direction

        // Initialize empty grid
        const emptyElement = this.registry.get('empty');
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    element: emptyElement,
                    lifetime: -1,
                    updated: false,
                    data: {} // Custom per-cell data for growth tracking, etc.
                };
            }
        }
    }

    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.grid[y][x];
    }

    getElement(x, y) {
        const cell = this.getCell(x, y);
        return cell ? cell.element : null;
    }

    setElement(x, y, element, preserveData = false, boulderId = null) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        if (!element) {
            console.error('PixelGrid.setElement: element is undefined at position', x, y);
            return;
        }

        const cell = this.grid[y][x];
        const wasEmpty = cell.element.id === 0;
        const isEmpty = element.id === 0;

        if (wasEmpty && !isEmpty) this.particleCount++;
        if (!wasEmpty && isEmpty) this.particleCount--;

        cell.element = element;
        cell.lifetime = element.defaultLifetime;
        cell.updated = false;

        // Reset data unless explicitly preserving it
        if (!preserveData) {
            cell.data = {};
            // Store boulder ID if provided (for stone elements)
            if (boulderId !== null) {
                cell.data.boulderId = boulderId;
            }
        }
    }

    isEmpty(x, y) {
        const element = this.getElement(x, y);
        return element && element.id === 0;
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    canMoveTo(fromX, fromY, toX, toY) {
        if (!this.isInBounds(toX, toY)) return false;

        const fromElement = this.getElement(fromX, fromY);
        const toElement = this.getElement(toX, toY);

        if (!fromElement || !toElement) return false;

        // Can move into empty space
        if (toElement.id === 0) return true;

        // Can displace less dense materials
        return fromElement.density > toElement.density && toElement.movable;
    }

    swap(x1, y1, x2, y2) {
        if (!this.isInBounds(x1, y1) || !this.isInBounds(x2, y2)) return;

        const temp = this.grid[y1][x1];
        this.grid[y1][x1] = this.grid[y2][x2];
        this.grid[y2][x2] = temp;

        this.grid[y2][x2].updated = true;
    }

    update() {
        // Increment frame counter and determine scan direction for THIS FRAME
        this.frameCount++;
        const startLeft = this.frameCount % 2 === 0; // Alternate each frame, not each row!

        // Reset processed boulders tracking for stone element
        const stoneElement = this.registry.get('stone');
        if (stoneElement && stoneElement.processedBoulders) {
            stoneElement.processedBoulders.clear();
        }

        // Reset updated flags
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x].updated = false;
            }
        }

        // Update from bottom to top, use consistent scan direction for entire frame
        for (let y = this.height - 1; y >= 0; y--) {
            for (let i = 0; i < this.width; i++) {
                const x = startLeft ? i : this.width - 1 - i;
                const cell = this.grid[y][x];

                if (cell.updated || cell.element.id === 0) continue;

                // Handle lifetime
                if (cell.lifetime > 0) {
                    cell.lifetime--;
                    if (cell.lifetime === 0) {
                        this.setElement(x, y, this.registry.get('empty'));
                        continue;
                    }
                }

                // Let the element update itself
                cell.element.update(x, y, this);

                // Check for interactions with neighbors
                this.checkInteractions(x, y);
            }
        }
    }

    checkInteractions(x, y) {
        const element = this.getElement(x, y);
        if (!element || element.id === 0) return;

        // Check all adjacent cells for interactions (including diagonals)
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const neighborElement = this.getElement(nx, ny);
            if (neighborElement && neighborElement.id !== 0) {
                // Use registry's interaction manager
                if (this.registry.checkInteraction(element, neighborElement, this, x, y, nx, ny)) {
                    return; // Interaction occurred, stop checking
                }
            }
        }
    }

    // Boulder system methods
    getBoulderPixels(boulderId) {
        const pixels = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y][x];
                if (cell.data.boulderId === boulderId) {
                    pixels.push({ x, y, cell });
                }
            }
        }
        return pixels;
    }

    canBoulderMoveDown(boulderId) {
        const pixels = this.getBoulderPixels(boulderId);
        if (pixels.length === 0) return false;

        // Check every pixel in the boulder
        for (const { x, y } of pixels) {
            const targetY = y + 1;

            // Check if target is out of bounds
            if (targetY >= this.height) return false;

            const targetCell = this.grid[targetY][x];

            // If target is empty, OK
            if (targetCell.element.id === 0) continue;

            // If target is part of same boulder, OK (boulder occupies multiple rows)
            if (targetCell.data.boulderId === boulderId) continue;

            // If target is something else, boulder is blocked
            return false;
        }

        return true;
    }

    moveBoulderDown(boulderId) {
        const pixels = this.getBoulderPixels(boulderId);

        // Sort by Y descending (bottom to top) to avoid overwriting
        pixels.sort((a, b) => b.y - a.y);

        const emptyElement = this.registry.get('empty');

        // Move each pixel down
        for (const { x, y } of pixels) {
            const cell = this.grid[y][x];
            const targetCell = this.grid[y + 1][x];

            // Skip if target is part of same boulder (already moving)
            if (targetCell.data.boulderId === boulderId) continue;

            // Move pixel to target
            this.grid[y + 1][x] = {
                element: cell.element,
                lifetime: cell.lifetime,
                updated: true, // Mark as updated
                data: { boulderId: boulderId } // Preserve boulder ID
            };

            // Clear source
            this.grid[y][x] = {
                element: emptyElement,
                lifetime: -1,
                updated: false,
                data: {}
            };
        }
    }
}

export default PixelGrid;
