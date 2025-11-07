import Element from '../Element.js';
import { STATE } from '../ElementProperties.js';

class CloudElement extends Element {
    constructor() {
        super(13, 'cloud', 0xf0f0f0, {
            density: 0,
            state: STATE.GAS,
            dispersion: 1,
            lifetime: 1200, // Clouds last longer - 20 seconds
            tags: [],
            brushSize: 3,
            emissionDensity: 0.5
        });

        // Define atmosphere boundary (upper 25% of screen)
        this.atmosphereThreshold = 0.25;
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize rain timer and water capacity if not set
        if (cell.data.rainTimer === undefined) {
            // Random initial delay before cloud can produce rain (2-8 seconds)
            cell.data.rainTimer = Math.floor(Math.random() * 360) + 120;
            // Each cloud can only produce 1-2 water droplets (reduced from infinite)
            cell.data.waterCapacity = Math.random() > 0.5 ? 2 : 1;
        }

        // Check if we're in the atmosphere layer
        const atmosphereHeight = Math.floor(grid.height * this.atmosphereThreshold);
        const isInAtmosphere = y < atmosphereHeight;

        // RAIN GENERATION - check if cloud should release water
        if (cell.data.rainTimer > 0) {
            cell.data.rainTimer--;
        } else {
            // Only produce rain if cloud still has water capacity
            if (cell.data.waterCapacity > 0) {
                // Check density of clouds nearby to determine if it should rain
                const cloudDensity = this.getCloudDensity(x, y, grid);

                // Higher chance of rain with more clouds nearby
                const rainChance = cloudDensity > 5 ? 0.02 : cloudDensity > 3 ? 0.01 : 0.005;

                if (Math.random() < rainChance) {
                    // Release water droplet below
                    const below = grid.getCell(x, y + 1);
                    if (below && below.element.id === 0) {
                        const waterElement = grid.registry.get('water');
                        if (waterElement) {
                            grid.setElement(x, y + 1, waterElement);
                            // Decrease water capacity
                            cell.data.waterCapacity--;
                        }
                    }
                    // Reset timer
                    cell.data.rainTimer = Math.floor(Math.random() * 180) + 60;
                }
            }
        }

        // Cloud behavior depends on whether it's in atmosphere
        if (isInAtmosphere) {
            // In atmosphere: spread horizontally and drift slowly

            // Slow horizontal drift (60% chance)
            if (Math.random() > 0.4) {
                const dir = Math.random() > 0.5 ? 1 : -1;

                if (grid.isEmpty(x + dir, y)) {
                    grid.swap(x, y, x + dir, y);
                    return true;
                }
                if (grid.isEmpty(x - dir, y)) {
                    grid.swap(x, y, x - dir, y);
                    return true;
                }
            }

            // Occasional gentle rise (10% chance)
            if (Math.random() > 0.9) {
                if (grid.isEmpty(x, y - 1)) {
                    grid.swap(x, y, x, y - 1);
                    return true;
                }
            }

            return false;
        } else {
            // Below atmosphere: rise quickly to reach atmosphere
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }

            // Diagonal rise
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y - 1)) {
                grid.swap(x, y, x + dir, y - 1);
                return true;
            }
            if (grid.isEmpty(x - dir, y - 1)) {
                grid.swap(x, y, x - dir, y - 1);
                return true;
            }

            return false;
        }
    }

    // Count nearby clouds to determine local density
    getCloudDensity(x, y, grid) {
        let count = 0;
        const radius = 3;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'cloud') {
                    count++;
                }
            }
        }

        return count;
    }
}

export default CloudElement;
