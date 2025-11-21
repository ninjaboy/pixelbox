/**
 * SpatialGrid.js
 *
 * Spatial acceleration structure for efficient neighbor queries.
 * Uses uniform grid (spatial hash) to divide world space into cells.
 *
 * This allows O(1) insertion and O(k) neighbor queries where k is the
 * number of particles in nearby cells, instead of O(n) for all particles.
 *
 * Critical for performance when simulating thousands of particles.
 */

export class SpatialGrid {
    /**
     * @param {number} worldWidth - Width of world in grid cells
     * @param {number} worldHeight - Height of world in grid cells
     * @param {number} cellSize - Size of each spatial cell (typically 2-4)
     */
    constructor(worldWidth, worldHeight, cellSize = 3) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.cellSize = cellSize;

        // Calculate grid dimensions
        this.gridWidth = Math.ceil(worldWidth / cellSize);
        this.gridHeight = Math.ceil(worldHeight / cellSize);

        // Grid storage: Map<cellKey, Set<particleIndex>>
        // Using Map instead of 2D array for sparse grids (memory efficient)
        this.cells = new Map();

        // Cache for neighbor queries
        this.neighborCache = new Set();

        // Statistics
        this.stats = {
            insertions: 0,
            queries: 0,
            avgNeighbors: 0
        };
    }

    /**
     * Clear all cells
     */
    clear() {
        this.cells.clear();
        this.stats.insertions = 0;
        this.stats.queries = 0;
    }

    /**
     * Convert world coordinates to grid cell coordinates
     * @param {number} x - World x
     * @param {number} y - World y
     */
    worldToGrid(x, y) {
        return {
            gx: Math.floor(x / this.cellSize),
            gy: Math.floor(y / this.cellSize)
        };
    }

    /**
     * Get cell key from grid coordinates
     * @param {number} gx - Grid x
     * @param {number} gy - Grid y
     */
    getCellKey(gx, gy) {
        // Numeric key for fast Map lookups
        return gy * this.gridWidth + gx;
    }

    /**
     * Get cell key from world coordinates
     * @param {number} x - World x
     * @param {number} y - World y
     */
    getCellKeyFromWorld(x, y) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        return this.getCellKey(gx, gy);
    }

    /**
     * Insert particle into spatial grid
     * @param {number} particleIndex - Index in particle array
     * @param {Particle} particle - Particle object
     */
    insert(particleIndex, particle) {
        const cellKey = this.getCellKeyFromWorld(particle.x, particle.y);

        // Get or create cell set
        if (!this.cells.has(cellKey)) {
            this.cells.set(cellKey, new Set());
        }

        this.cells.get(cellKey).add(particleIndex);
        particle.gridCell = cellKey; // Cache cell key in particle

        this.stats.insertions++;
    }

    /**
     * Remove particle from spatial grid
     * @param {Particle} particle - Particle object
     */
    remove(particle) {
        if (particle.gridCell !== -1) {
            const cell = this.cells.get(particle.gridCell);
            if (cell) {
                cell.delete(particle.index);
                // Clean up empty cells
                if (cell.size === 0) {
                    this.cells.delete(particle.gridCell);
                }
            }
            particle.gridCell = -1;
        }
    }

    /**
     * Update particle position in grid (when it moves)
     * @param {Particle} particle - Particle object
     */
    update(particle) {
        const newCellKey = this.getCellKeyFromWorld(particle.x, particle.y);

        // Only update if cell changed
        if (particle.gridCell !== newCellKey) {
            // Remove from old cell
            if (particle.gridCell !== -1) {
                const oldCell = this.cells.get(particle.gridCell);
                if (oldCell) {
                    oldCell.delete(particle.index);
                    if (oldCell.size === 0) {
                        this.cells.delete(particle.gridCell);
                    }
                }
            }

            // Add to new cell
            if (!this.cells.has(newCellKey)) {
                this.cells.set(newCellKey, new Set());
            }
            this.cells.get(newCellKey).add(particle.index);
            particle.gridCell = newCellKey;
        }
    }

    /**
     * Query neighbors around a particle
     * Returns particle indices in the same and adjacent cells
     * @param {Particle} particle - Center particle
     * @param {number} radius - Search radius in cells (1 = 3x3, 2 = 5x5)
     * @returns {Set<number>} Set of particle indices
     */
    queryNeighbors(particle, radius = 1) {
        this.neighborCache.clear();

        const { gx, gy } = this.worldToGrid(particle.x, particle.y);

        // Check all cells in radius
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const ngx = gx + dx;
                const ngy = gy + dy;

                // Bounds check
                if (ngx >= 0 && ngx < this.gridWidth && ngy >= 0 && ngy < this.gridHeight) {
                    const cellKey = this.getCellKey(ngx, ngy);
                    const cell = this.cells.get(cellKey);

                    if (cell) {
                        // Add all particles in this cell
                        for (const idx of cell) {
                            // Skip self
                            if (idx !== particle.index) {
                                this.neighborCache.add(idx);
                            }
                        }
                    }
                }
            }
        }

        this.stats.queries++;
        this.stats.avgNeighbors = (this.stats.avgNeighbors * (this.stats.queries - 1) + this.neighborCache.size) / this.stats.queries;

        return this.neighborCache;
    }

    /**
     * Query neighbors within circular radius
     * @param {number} x - World x center
     * @param {number} y - World y center
     * @param {number} radius - World space radius
     * @param {Array<Particle>} particles - Particle array
     * @returns {Array<number>} Array of particle indices
     */
    queryCircle(x, y, radius, particles) {
        const result = [];
        const radiusSq = radius * radius;

        const { gx, gy } = this.worldToGrid(x, y);
        const cellRadius = Math.ceil(radius / this.cellSize);

        // Check all cells that could contain particles in radius
        for (let dy = -cellRadius; dy <= cellRadius; dy++) {
            for (let dx = -cellRadius; dx <= cellRadius; dx++) {
                const ngx = gx + dx;
                const ngy = gy + dy;

                if (ngx >= 0 && ngx < this.gridWidth && ngy >= 0 && ngy < this.gridHeight) {
                    const cellKey = this.getCellKey(ngx, ngy);
                    const cell = this.cells.get(cellKey);

                    if (cell) {
                        for (const idx of cell) {
                            const particle = particles[idx];
                            if (!particle.active) continue;

                            const dx = particle.x - x;
                            const dy = particle.y - y;
                            const distSq = dx * dx + dy * dy;

                            if (distSq <= radiusSq) {
                                result.push(idx);
                            }
                        }
                    }
                }
            }
        }

        return result;
    }

    /**
     * Query neighbors in rectangular region
     * @param {number} minX - Min x
     * @param {number} minY - Min y
     * @param {number} maxX - Max x
     * @param {number} maxY - Max y
     * @returns {Set<number>} Set of particle indices
     */
    queryRect(minX, minY, maxX, maxY) {
        const result = new Set();

        const { gx: minGx, gy: minGy } = this.worldToGrid(minX, minY);
        const { gx: maxGx, gy: maxGy } = this.worldToGrid(maxX, maxY);

        for (let gy = minGy; gy <= maxGy; gy++) {
            for (let gx = minGx; gx <= maxGx; gx++) {
                if (gx >= 0 && gx < this.gridWidth && gy >= 0 && gy < this.gridHeight) {
                    const cellKey = this.getCellKey(gx, gy);
                    const cell = this.cells.get(cellKey);

                    if (cell) {
                        for (const idx of cell) {
                            result.add(idx);
                        }
                    }
                }
            }
        }

        return result;
    }

    /**
     * Get all particles in a specific cell
     * @param {number} gx - Grid x
     * @param {number} gy - Grid y
     * @returns {Set<number>|null} Set of particle indices or null
     */
    getCell(gx, gy) {
        const cellKey = this.getCellKey(gx, gy);
        return this.cells.get(cellKey) || null;
    }

    /**
     * Get particle count in a cell
     * @param {number} gx - Grid x
     * @param {number} gy - Grid y
     */
    getCellCount(gx, gy) {
        const cell = this.getCell(gx, gy);
        return cell ? cell.size : 0;
    }

    /**
     * Check if cell is empty
     * @param {number} gx - Grid x
     * @param {number} gy - Grid y
     */
    isCellEmpty(gx, gy) {
        return this.getCellCount(gx, gy) === 0;
    }

    /**
     * Get density (particle count) at world position
     * @param {number} x - World x
     * @param {number} y - World y
     * @param {number} radius - Radius to check (in cells)
     */
    getDensity(x, y, radius = 1) {
        const { gx, gy } = this.worldToGrid(x, y);
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const ngx = gx + dx;
                const ngy = gy + dy;

                if (ngx >= 0 && ngx < this.gridWidth && ngy >= 0 && ngy < this.gridHeight) {
                    count += this.getCellCount(ngx, ngy);
                }
            }
        }

        return count;
    }

    /**
     * Rebuild entire grid from particle array
     * Call this when doing bulk updates
     * @param {Array<Particle>} particles - Array of all particles
     */
    rebuild(particles) {
        this.clear();

        for (let i = 0; i < particles.length; i++) {
            if (particles[i].active) {
                this.insert(i, particles[i]);
            }
        }
    }

    /**
     * Get grid statistics for debugging/optimization
     */
    getStats() {
        let totalParticles = 0;
        let maxCellCount = 0;
        let occupiedCells = 0;

        for (const [key, cell] of this.cells) {
            const count = cell.size;
            totalParticles += count;
            occupiedCells++;
            if (count > maxCellCount) {
                maxCellCount = count;
            }
        }

        const totalCells = this.gridWidth * this.gridHeight;
        const avgPerCell = occupiedCells > 0 ? totalParticles / occupiedCells : 0;

        return {
            totalCells,
            occupiedCells,
            totalParticles,
            avgPerCell: avgPerCell.toFixed(2),
            maxCellCount,
            occupancy: ((occupiedCells / totalCells) * 100).toFixed(1) + '%',
            insertions: this.stats.insertions,
            queries: this.stats.queries,
            avgNeighbors: this.stats.avgNeighbors.toFixed(1)
        };
    }

    /**
     * Visualize grid for debugging (returns cell occupancy data)
     */
    getVisualizationData() {
        const data = [];
        for (let gy = 0; gy < this.gridHeight; gy++) {
            const row = [];
            for (let gx = 0; gx < this.gridWidth; gx++) {
                row.push(this.getCellCount(gx, gy));
            }
            data.push(row);
        }
        return data;
    }
}
