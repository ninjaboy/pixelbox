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

        // Define atmosphere boundary (upper 40% of screen)
        this.atmosphereThreshold = 0.40;
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize saturation level if not set
        if (cell.data.saturation === undefined) {
            cell.data.saturation = 1; // Default small cloud
        }

        // Initialize rain cooldown timer
        if (cell.data.rainCooldown === undefined) {
            cell.data.rainCooldown = 0;
        }

        // Check if we're in the atmosphere layer
        const atmosphereHeight = Math.floor(grid.height * this.atmosphereThreshold);
        const isInAtmosphere = y < atmosphereHeight;

        // CLOUD ACCUMULATION SYSTEM

        // 1. Absorb nearby steam to increase saturation
        if (Math.random() > 0.7) { // 30% chance per frame to check for steam
            const nearbySteam = this.findNearbySteam(x, y, grid);
            if (nearbySteam) {
                // Absorb the steam
                grid.setElement(nearbySteam[0], nearbySteam[1], grid.registry.get('empty'));
                cell.data.saturation += 1;
                // Update color based on saturation
                this.updateCloudColor(cell);
            }
        }

        // 2. Merge with adjacent clouds
        if (Math.random() > 0.8) { // 20% chance per frame to check for merge
            const nearbyCloud = this.findAdjacentCloud(x, y, grid);
            if (nearbyCloud) {
                const [cloudX, cloudY] = nearbyCloud;
                const otherCell = grid.getCell(cloudX, cloudY);
                if (otherCell && otherCell.data.saturation !== undefined) {
                    // Merge: combine saturation and remove the other cloud
                    cell.data.saturation += otherCell.data.saturation;
                    grid.setElement(cloudX, cloudY, grid.registry.get('empty'));
                    this.updateCloudColor(cell);
                }
            }
        }

        // 3. RAIN GENERATION - saturated clouds produce rain
        if (cell.data.rainCooldown > 0) {
            cell.data.rainCooldown--;
        } else {
            // Check if cloud is saturated enough to rain
            if (cell.data.saturation >= 10) {
                // RAIN EVENT! Drop multiple water droplets
                this.triggerRainEvent(x, y, grid, cell);

                // Reduce saturation after raining
                cell.data.saturation -= 5;

                // Set cooldown before next rain (1-2 seconds)
                cell.data.rainCooldown = 60 + Math.floor(Math.random() * 60);

                // Update color after losing saturation
                this.updateCloudColor(cell);

                // If saturation drops too low, cloud dissipates
                if (cell.data.saturation <= 0) {
                    grid.setElement(x, y, grid.registry.get('empty'));
                    return true;
                }
            } else if (cell.data.saturation >= 5) {
                // Medium saturation: occasional light rain
                if (Math.random() < 0.01) {
                    this.dropSingleRain(x, y, grid);
                    cell.data.saturation -= 1;
                    cell.data.rainCooldown = 30;
                    this.updateCloudColor(cell);
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

    // Find nearby steam to absorb
    findNearbySteam(x, y, grid) {
        const radius = 3;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'steam') {
                    return [x + dx, y + dy];
                }
            }
        }
        return null;
    }

    // Find adjacent cloud for merging
    findAdjacentCloud(x, y, grid) {
        const adjacent = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
        ];

        for (const [cx, cy] of adjacent) {
            const element = grid.getElement(cx, cy);
            if (element && element.name === 'cloud') {
                return [cx, cy];
            }
        }
        return null;
    }

    // Trigger dramatic rain event for saturated clouds
    triggerRainEvent(x, y, grid, cell) {
        // Drop 3-6 water droplets in burst
        const rainAmount = 3 + Math.floor(Math.random() * 4);
        const waterElement = grid.registry.get('water');
        if (!waterElement) return;

        let dropsCreated = 0;
        // Try to create rain drops below and around the cloud
        for (let dy = 1; dy <= 3 && dropsCreated < rainAmount; dy++) {
            for (let dx = -1; dx <= 1 && dropsCreated < rainAmount; dx++) {
                const targetCell = grid.getCell(x + dx, y + dy);
                if (targetCell && targetCell.element.id === 0) {
                    grid.setElement(x + dx, y + dy, waterElement);
                    dropsCreated++;
                }
            }
        }
    }

    // Drop single rain droplet
    dropSingleRain(x, y, grid) {
        const waterElement = grid.registry.get('water');
        if (!waterElement) return;

        const below = grid.getCell(x, y + 1);
        if (below && below.element.id === 0) {
            grid.setElement(x, y + 1, waterElement);
        }
    }

    // Update cloud color based on saturation (darker = more saturated)
    updateCloudColor(cell) {
        const saturation = cell.data.saturation;

        // Color gradient: light grey (1) -> dark grey (10+)
        // 0xf0f0f0 (light) -> 0x808080 (dark)
        let brightness;
        if (saturation <= 1) {
            brightness = 0xf0; // Very light
        } else if (saturation <= 5) {
            brightness = 0xd0; // Light
        } else if (saturation <= 10) {
            brightness = 0xb0; // Medium
        } else {
            brightness = 0x90; // Dark (heavy rain cloud)
        }

        cell.element.color = (brightness << 16) | (brightness << 8) | brightness;
    }
}

export default CloudElement;
