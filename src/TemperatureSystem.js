/**
 * TemperatureSystem.js (v5.0.0)
 * Per-cell temperature with hybrid diffusion near heat/cold sources.
 * State transitions (ice→water→steam, lava→stone, etc.)
 */

class TemperatureSystem {
    constructor(grid) {
        this.grid = grid;
        this.diffusionRate = 0.15;       // Heat transfer coefficient
        this.ambientTemp = 20;           // Updated from seasonal system
        this.updateInterval = 3;         // Diffuse every N frames
        this.activeRadius = 6;           // Diffuse within N cells of heat/cold sources
        this.heatSources = new Set();    // Numeric keys of heat/cold source positions
        // Reuse set across frames to avoid allocation
        this._cellsToProcess = new Set();
    }

    /**
     * Update ambient from seasonal system.
     * Maps existing -1..+1 temperature to Celsius.
     */
    setSeasonalAmbient(seasonData) {
        if (!seasonData || seasonData.temperature == null) return;
        // winter=-1 → -10°C, summer=+1 → 35°C
        this.ambientTemp = 12.5 + (seasonData.temperature * 22.5);
    }

    registerHeatSource(x, y) {
        this.heatSources.add(this.grid.coordToKey(x, y));
    }

    unregisterHeatSource(x, y) {
        this.heatSources.delete(this.grid.coordToKey(x, y));
    }

    /**
     * Called once per frame from PixelGrid.update().
     * Runs diffusion + state transitions every updateInterval frames.
     */
    update(frameCount) {
        if (frameCount % this.updateInterval !== 0) return;

        // Build set of cells to process (within radius of any heat/cold source)
        const cellsToProcess = this._cellsToProcess;
        cellsToProcess.clear();

        const width = this.grid.width;
        const height = this.grid.height;

        for (const sourceKey of this.heatSources) {
            const sx = sourceKey % width;
            const sy = Math.floor(sourceKey / width);

            const minY = Math.max(0, sy - this.activeRadius);
            const maxY = Math.min(height - 1, sy + this.activeRadius);
            const minX = Math.max(0, sx - this.activeRadius);
            const maxX = Math.min(width - 1, sx + this.activeRadius);

            for (let ny = minY; ny <= maxY; ny++) {
                for (let nx = minX; nx <= maxX; nx++) {
                    cellsToProcess.add(ny * width + nx);
                }
            }
        }

        if (cellsToProcess.size === 0) return;

        // Apply heat output from sources first
        for (const sourceKey of this.heatSources) {
            const sx = sourceKey % width;
            const sy = Math.floor(sourceKey / width);
            const cell = this.grid.grid[sy]?.[sx];
            if (!cell || cell.element.id === 0) continue;

            const heatOutput = cell.element.heatOutput;
            if (heatOutput === 0) continue;

            // Apply heat output to the source cell itself (maintain its temperature)
            const sourceTemp = cell.state.getTemperature();
            const targetTemp = cell.element.temp || (heatOutput > 0 ? 600 : -20);
            if (heatOutput > 0 && sourceTemp < targetTemp) {
                cell.state.setTemperature(Math.min(sourceTemp + heatOutput * 0.1, targetTemp));
            } else if (heatOutput < 0 && sourceTemp > targetTemp) {
                cell.state.setTemperature(Math.max(sourceTemp + heatOutput * 0.1, targetTemp));
            }
        }

        // Diffuse temperatures and check state transitions
        for (const key of cellsToProcess) {
            const x = key % width;
            const y = Math.floor(key / width);
            const cell = this.grid.grid[y]?.[x];
            if (!cell || cell.element.id === 0) continue;

            // Skip insulating elements
            if (cell.element.insulate) continue;

            const currentTemp = cell.state.getTemperature();

            // Gather neighbor temperatures
            let neighborSum = 0;
            let neighborCount = 0;

            // Cardinal neighbors
            const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            for (const [dx, dy] of offsets) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                const neighbor = this.grid.grid[ny][nx];
                if (!neighbor) continue;
                if (neighbor.element.insulate) continue;

                if (neighbor.element.id === 0) {
                    // Empty space trends toward ambient
                    neighborSum += this.ambientTemp;
                } else {
                    neighborSum += neighbor.state.getTemperature();
                }
                neighborCount++;
            }

            if (neighborCount === 0) continue;

            const avgNeighbor = neighborSum / neighborCount;
            let newTemp = currentTemp + this.diffusionRate * (avgNeighbor - currentTemp);

            // Ambient decay — cells slowly trend toward ambient
            const ambientDecay = 0.005;
            newTemp = newTemp + ambientDecay * (this.ambientTemp - newTemp);

            cell.state.setTemperature(Math.round(newTemp));

            // State transitions
            this.checkStateTransition(cell, x, y, Math.round(newTemp));
        }
    }

    /**
     * Check if a cell's temperature has crossed a threshold.
     */
    checkStateTransition(cell, x, y, temp) {
        const element = cell.element;

        // High threshold (heating)
        if (element.tempHigh != null && temp >= element.tempHigh && element.stateHigh) {
            const newElement = this.grid.registry.get(element.stateHigh);
            if (newElement) {
                this.grid.setElement(x, y, newElement, true);
                // Preserve temperature through transition
                const newCell = this.grid.getCell(x, y);
                if (newCell) newCell.state.setTemperature(temp);
                return true;
            }
        }

        // Low threshold (cooling)
        if (element.tempLow != null && temp <= element.tempLow && element.stateLow) {
            const newElement = this.grid.registry.get(element.stateLow);
            if (newElement) {
                this.grid.setElement(x, y, newElement, true);
                const newCell = this.grid.getCell(x, y);
                if (newCell) newCell.state.setTemperature(temp);
                return true;
            }
        }

        return false;
    }
}

export default TemperatureSystem;
