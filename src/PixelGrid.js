// Pixel Grid Class - manages the particle simulation with element objects
import { CellState } from './CellState.js';
import { STATE } from './ElementProperties.js';
import { ConstructionManager } from './ConstructionManager.js';
import { LightingManager } from './LightingManager.js';

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

        // PERFORMANCE: Track active cells with numeric keys and cached coordinates
        // Key formula: y * width + x (avoids expensive string parsing)
        // Value: {x, y} coordinates (eliminates keyToCoord() calls)
        this.activeCells = new Map(); // Map<number, {x: number, y: number}>

        // PERFORMANCE: Track active house constructions (avoids full grid scan)
        // Stores numeric keys of cells with construction data
        this.activeConstructions = new Set(); // Set<number>

        // PERFORMANCE: Reusable neighbor offset arrays (no per-call allocation)
        this.neighborOffsets = [
            [0, -1], [0, 1], [-1, 0], [1, 0],           // Cardinal
            [-1, -1], [1, -1], [-1, 1], [1, 1]          // Diagonal
        ];

        // Initialize empty grid
        const emptyElement = this.registry.get('empty');
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    element: emptyElement,
                    lifetime: -1,
                    updated: false,
                    state: new CellState(), // NEW: Unified state management
                    data: {} // Legacy support - gradually migrate to state
                };
            }
        }
    }

    // PERFORMANCE: Convert coordinates to numeric key (avoids string parsing)
    coordToKey(x, y) {
        return y * this.width + x;
    }

    // PERFORMANCE: Convert numeric key back to coordinates
    keyToCoord(key) {
        return {
            x: key % this.width,
            y: Math.floor(key / this.width)
        };
    }

    // PERFORMANCE: Register a construction position for efficient updates
    registerConstruction(x, y) {
        const key = this.coordToKey(x, y);
        this.activeConstructions.add(key);
    }

    // PERFORMANCE: Unregister a construction when complete
    unregisterConstruction(x, y) {
        const key = this.coordToKey(x, y);
        this.activeConstructions.delete(key);
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

        // PERFORMANCE: Use numeric key instead of string
        const numericKey = this.coordToKey(x, y);
        const posKey = `${x},${y}`; // Keep for boulder cache (legacy)

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

        // PERFORMANCE: Update active cells tracking with cached coordinates
        if (wasEmpty && !isEmpty) {
            this.particleCount++;
            this.activeCells.set(numericKey, { x, y });
        }
        if (!wasEmpty && isEmpty) {
            this.particleCount--;
            this.activeCells.delete(numericKey);
        }

        cell.element = element;
        cell.lifetime = element.defaultLifetime;
        cell.updated = false;

        // Reset data unless explicitly preserving it
        if (!preserveData) {
            cell.state = new CellState(); // NEW: Reset state
            cell.data = {};
            // Store boulder ID and add to cache if provided
            if (boulderId !== null) {
                cell.data.boulderId = boulderId;
                if (!this.boulderCache.has(boulderId)) {
                    this.boulderCache.set(boulderId, new Set());
                }
                this.boulderCache.get(boulderId).add(posKey);
            }

            // OPTIMIZATION: Call element's initialization hook if it exists
            // This allows elements (like Fish) to eagerly initialize their state
            if (element.initializeCell && typeof element.initializeCell === 'function') {
                element.initializeCell(cell.data);
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

        // Prevent powder-powder swapping - powders should form stable piles
        if (fromElement.state === STATE.POWDER && toElement.state === STATE.POWDER) {
            return false;
        }

        // Can displace less dense materials
        return fromElement.density > toElement.density && toElement.movable;
    }

    swap(x1, y1, x2, y2) {
        if (!this.isInBounds(x1, y1) || !this.isInBounds(x2, y2)) return;

        const cell1 = this.grid[y1][x1];
        const cell2 = this.grid[y2][x2];

        // PERFORMANCE: Update active cells tracking during swap with cached coordinates
        const pos1Key = this.coordToKey(x1, y1);
        const pos2Key = this.coordToKey(x2, y2);
        const cell1Empty = cell1.element.id === 0;
        const cell2Empty = cell2.element.id === 0;

        if (!cell1Empty && cell2Empty) {
            // Moving from pos1 to pos2
            this.activeCells.delete(pos1Key);
            this.activeCells.set(pos2Key, { x: x2, y: y2 });
        } else if (cell1Empty && !cell2Empty) {
            // Moving from pos2 to pos1
            this.activeCells.delete(pos2Key);
            this.activeCells.set(pos1Key, { x: x1, y: y1 });
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

        // PERFORMANCE: Only reset updated flags for active cells using cached coords
        for (const [numericKey, coords] of this.activeCells) {
            const cell = this.grid[coords.y]?.[coords.x];
            if (cell) {
                cell.updated = false;
            }
        }

        // PERFORMANCE: Group active cells by row using cached coordinates
        const cellsByRow = new Map();
        for (const [numericKey, coords] of this.activeCells) {
            const y = coords.y;
            const x = coords.x;
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

                // PERFORMANCE: Check interactions every 2 frames AND skip static elements
                // Saves ~50% of interaction checks + skips walls/glass/obsidian
                if (this.frameCount % 2 === 0 && cell.element.canInteract !== false) {
                    this.checkInteractions(x, y);
                }
            }
        }

        // Update all active house constructions
        ConstructionManager.updateConstructions(this);

        // Update house lighting based on time of day
        if (this.timeOfDay !== undefined) {
            LightingManager.updateHouseLights(this, this.timeOfDay);
        }
    }

    // Set time of day (called from main game scene)
    setTimeOfDay(time) {
        this.timeOfDay = time;
    }

    checkInteractions(x, y) {
        const element = this.getElement(x, y);
        if (!element || element.id === 0) return;

        // PERFORMANCE: Use reusable offset array (no allocation)
        for (const [dx, dy] of this.neighborOffsets) {
            const nx = x + dx;
            const ny = y + dy;

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
