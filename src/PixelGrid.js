// Pixel Grid Class - manages the particle simulation with element objects
class PixelGrid {
    constructor(width, height, pixelSize, registry) {
        this.width = Math.floor(width / pixelSize);
        this.height = Math.floor(height / pixelSize);
        this.pixelSize = pixelSize;
        this.registry = registry;
        this.grid = [];
        this.particleCount = 0;
        this.frameCount = 0; // Track frames
        this.boulderCache = new Map(); // boulderId → Set of "x,y" position strings

        // CRITICAL FIX: Track only non-empty cells to prevent FPS degradation
        this.activeCells = new Set(); // Set of "x,y" position strings

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
        const oldBoulderId = cell.data.boulderId;
        const posKey = `${x},${y}`;

        // Remove from old boulder cache if this cell had a boulder ID
        if (oldBoulderId !== undefined) {
            const cache = this.boulderCache.get(oldBoulderId);
            if (cache) {
                cache.delete(posKey);
                if (cache.size === 0) {
                    this.boulderCache.delete(oldBoulderId);
                }
            }
        }

        // CRITICAL FIX: Update active cells tracking
        if (wasEmpty && !isEmpty) {
            this.particleCount++;
            this.activeCells.add(posKey);
        }
        if (!wasEmpty && isEmpty) {
            this.particleCount--;
            this.activeCells.delete(posKey);
        }

        cell.element = element;
        cell.lifetime = element.defaultLifetime;
        cell.updated = false;

        // Reset data unless explicitly preserving it
        if (!preserveData) {
            cell.data = {};
            // Store boulder ID and add to cache if provided
            if (boulderId !== null) {
                cell.data.boulderId = boulderId;
                if (!this.boulderCache.has(boulderId)) {
                    this.boulderCache.set(boulderId, new Set());
                }
                this.boulderCache.get(boulderId).add(posKey);
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

        const cell1 = this.grid[y1][x1];
        const cell2 = this.grid[y2][x2];

        // CRITICAL FIX: Update active cells tracking during swap
        const pos1Key = `${x1},${y1}`;
        const pos2Key = `${x2},${y2}`;
        const cell1Empty = cell1.element.id === 0;
        const cell2Empty = cell2.element.id === 0;

        if (!cell1Empty && cell2Empty) {
            // Moving from pos1 to pos2
            this.activeCells.delete(pos1Key);
            this.activeCells.add(pos2Key);
        } else if (cell1Empty && !cell2Empty) {
            // Moving from pos2 to pos1
            this.activeCells.delete(pos2Key);
            this.activeCells.add(pos1Key);
        }
        // If both empty or both filled, activeCells doesn't change

        this.grid[y1][x1] = cell2;
        this.grid[y2][x2] = cell1;

        this.grid[y2][x2].updated = true;
    }

    update() {
        // Increment frame counter
        this.frameCount++;

        // Reset processed boulders tracking for stone element
        const stoneElement = this.registry.get('stone');
        if (stoneElement && stoneElement.processedBoulders) {
            stoneElement.processedBoulders.clear();
        }

        // CRITICAL FIX: Only reset updated flags for active cells
        for (const posKey of this.activeCells) {
            const [x, y] = posKey.split(',').map(Number);
            const cell = this.grid[y]?.[x];
            if (cell) {
                cell.updated = false;
            }
        }

        // CRITICAL FIX: Group active cells by row and sort bottom to top
        const cellsByRow = new Map();
        for (const posKey of this.activeCells) {
            const [x, y] = posKey.split(',').map(Number);
            if (!cellsByRow.has(y)) {
                cellsByRow.set(y, []);
            }
            cellsByRow.get(y).push(x);
        }

        // Update from bottom to top
        const sortedRows = Array.from(cellsByRow.keys()).sort((a, b) => b - a);

        for (const y of sortedRows) {
            const xPositions = cellsByRow.get(y);

            // Randomize scan direction for even spreading
            const startLeft = Math.random() > 0.5;
            if (startLeft) {
                xPositions.sort((a, b) => a - b);
            } else {
                xPositions.sort((a, b) => b - a);
            }

            for (const x of xPositions) {
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
        const cache = this.boulderCache.get(boulderId);
        if (!cache) return [];

        const pixels = [];
        for (const posKey of cache) {
            const [x, y] = posKey.split(',').map(Number);
            pixels.push({ x, y, cell: this.grid[y][x] });
        }
        return pixels;
    }

    canBoulderMoveDown(boulderId) {
        const pixels = this.getBoulderPixels(boulderId);
        if (pixels.length === 0) return false;

        // Get boulder element (stone) to check its density
        const boulderElement = this.registry.get('stone');

        // Check every pixel in the boulder
        for (const { x, y } of pixels) {
            const targetY = y + 1;

            // Check if target is out of bounds
            if (targetY >= this.height) return false;

            const targetCell = this.grid[targetY][x];
            const targetElement = targetCell.element;

            // If target is empty, OK
            if (targetElement.id === 0) continue;

            // If target is part of same boulder, OK (boulder occupies multiple rows)
            if (targetCell.data.boulderId === boulderId) continue;

            // If target is a liquid (water, oil), can displace it
            if (targetElement.state === 'liquid' && boulderElement.density > targetElement.density) {
                continue;
            }

            // Otherwise, boulder is blocked (can't fall through solids or powders)
            return false;
        }

        return true;
    }

    moveBoulderDown(boulderId) {
        const pixels = this.getBoulderPixels(boulderId);

        // Sort by Y descending (bottom to top) to avoid overwriting
        pixels.sort((a, b) => b.y - a.y);

        const emptyElement = this.registry.get('empty');
        const boulderElement = this.registry.get('stone');
        const cache = this.boulderCache.get(boulderId);

        // Move each pixel down
        for (const { x, y } of pixels) {
            const cell = this.grid[y][x];
            const targetCell = this.grid[y + 1][x];
            const targetElement = targetCell.element;

            // Skip if target is part of same boulder (already moving)
            if (targetCell.data.boulderId === boulderId) continue;

            // Check if target needs to be displaced (only liquids like water, oil)
            const shouldDisplace = targetElement.id !== 0 &&
                                   targetElement.state === 'liquid' &&
                                   boulderElement.density > targetElement.density;

            if (shouldDisplace) {
                // Swap: displaced element moves up, boulder moves down
                this.grid[y + 1][x] = {
                    element: cell.element,
                    lifetime: cell.lifetime,
                    updated: true,
                    data: { boulderId: boulderId }
                };
                this.grid[y][x] = {
                    element: targetElement,
                    lifetime: targetCell.lifetime,
                    updated: true,
                    data: targetCell.data // Preserve target's data
                };
            } else {
                // Normal move into empty space
                this.grid[y + 1][x] = {
                    element: cell.element,
                    lifetime: cell.lifetime,
                    updated: true,
                    data: { boulderId: boulderId }
                };
                this.grid[y][x] = {
                    element: emptyElement,
                    lifetime: -1,
                    updated: false,
                    data: {}
                };
            }

            // Update cache
            if (cache) {
                cache.delete(`${x},${y}`);
                cache.add(`${x},${y + 1}`);
            }
        }
    }
}

export default PixelGrid;
