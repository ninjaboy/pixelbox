import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class SteamVentElement extends Element {
    constructor() {
        super(33, 'steam_vent', 0x555555, { // Dark gray
            density: 10,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 1.0, // Cannot burn
            tags: [TAG.MINERAL],
            brushSize: 1,
            emissionDensity: 0.8
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize vent data
        if (cell.data.ventTimer === undefined) {
            cell.data.ventTimer = 0;
            cell.data.ventCycle = Math.floor(Math.random() * 60) + 30; // Random cycle 30-90 frames
            cell.data.ventActive = false;
            cell.data.ventDuration = 0;
        }

        cell.data.ventTimer++;

        // Start venting when timer reaches cycle
        if (!cell.data.ventActive && cell.data.ventTimer >= cell.data.ventCycle) {
            cell.data.ventActive = true;
            cell.data.ventDuration = Math.floor(Math.random() * 40) + 20; // Vent for 20-60 frames
            cell.data.ventTimer = 0;
        }

        // Emit steam when active
        if (cell.data.ventActive) {
            cell.data.ventDuration--;

            // Emit steam upward (high probability)
            if (Math.random() < 0.8) {
                const above = grid.getElement(x, y - 1);
                if (above && above.name === 'empty') {
                    grid.setElement(x, y - 1, grid.registry.get('steam'));
                    return true;
                }
            }

            // Stop venting when duration expires
            if (cell.data.ventDuration <= 0) {
                cell.data.ventActive = false;
                cell.data.ventCycle = Math.floor(Math.random() * 60) + 30; // New random cycle
                cell.data.ventTimer = 0;
            }
        }

        return false;
    }
}

export default SteamVentElement;
