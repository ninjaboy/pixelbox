import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { GasBehavior } from '../behaviors/MovementBehaviors.js';

class SteamElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.STEAM, 'steam', 0xcccccc, {
            density: 0,
            state: STATE.GAS,
            dispersion: 2,
            lifetime: 240, // Steam dissipates after 4 seconds
            condensesInto: 'cloud',  // Condenses into clouds at atmosphere
            tags: new Set([TAG.CONDENSES])
        });

        // Define atmosphere boundary (upper 40% of screen)
        this.atmosphereThreshold = 0.40;

        // Use standardized gas behavior (fast rise)
        this.movement = new GasBehavior({
            riseSpeed: 0.8, // Very fast rise
            spreadRate: 0.15, // Some sideways expansion
            dissipation: false // Lifetime handles dissipation
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if steam has reached the atmosphere layer
        const atmosphereHeight = Math.floor(grid.height * this.atmosphereThreshold);
        const inAtmosphere = y <= atmosphereHeight;

        if (inAtmosphere) {
            // NEW CLUSTERING SYSTEM: Check for nearby steam particles
            const nearbySteam = this.countNearbySteam(x, y, grid);

            // If 3+ steam particles are clustered together, form a cloud
            if (nearbySteam >= 3) {
                const cloudElement = grid.registry.get('cloud');
                if (cloudElement) {
                    // Convert this steam to cloud with initial saturation based on cluster size
                    grid.setElement(x, y, cloudElement);
                    const newCell = grid.getCell(x, y);
                    if (newCell) {
                        // Start with saturation based on how many steam particles were nearby
                        newCell.data.saturation = Math.min(nearbySteam, 5);
                    }
                    return true;
                }
            }

            // If not enough nearby steam, drift longer before timeout condensation
            if (cell.data.atmosphereTime === undefined) {
                cell.data.atmosphereTime = 0;
                // Longer delay encourages clustering (6-10 seconds)
                cell.data.condensationDelay = 360 + Math.floor(Math.random() * 240);
            }

            cell.data.atmosphereTime++;

            // Timeout: condense into small cloud after very long time alone
            if (cell.data.atmosphereTime >= cell.data.condensationDelay) {
                const cloudElement = grid.registry.get('cloud');
                if (cloudElement) {
                    grid.setElement(x, y, cloudElement);
                    const newCell = grid.getCell(x, y);
                    if (newCell) {
                        // Solo steam makes weak cloud (saturation = 1)
                        newCell.data.saturation = 1;
                    }
                    return true;
                }
            }
        } else {
            // Reset timer if steam drops below atmosphere
            if (cell.data.atmosphereTime !== undefined) {
                delete cell.data.atmosphereTime;
                delete cell.data.condensationDelay;
            }
        }

        if (inAtmosphere) {
            // In atmosphere - stop rising, just drift horizontally
            if (Math.random() > 0.5) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                if (grid.isEmpty(x + dir, y)) {
                    grid.swap(x, y, x + dir, y);
                    return true;
                }
            }
            return false;
        } else {
            // Below atmosphere - use standardized gas behavior
            return this.movement.apply(x, y, grid);
        }
    }

    // Count nearby steam particles for clustering detection
    countNearbySteam(x, y, grid) {
        let count = 0;
        const radius = 2; // Check 2-pixel radius

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip self

                const element = grid.getElement(x + dx, y + dy);
                if (element && element.name === 'steam') {
                    count++;
                }
            }
        }

        return count;
    }
}

export default SteamElement;
