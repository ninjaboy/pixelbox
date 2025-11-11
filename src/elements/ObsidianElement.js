import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class ObsidianElement extends Element {
    constructor() {
        super(32, 'obsidian', 0x0a0a14, { // Very dark purple-black
            density: 10, // Very heavy, like stone
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 1.0, // Cannot burn
            tags: [TAG.MINERAL, TAG.VERY_HOT], // Newly formed obsidian is very hot!
            brushSize: 2,
            emissionDensity: 0.8
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Only hot obsidian (created by lava-water) has temperature tracking
        // Regular placed obsidian doesn't have temperature and stays cool
        if (cell.data.temperature !== undefined) {
            // Natural cooling over time (slower than water cooling)
            if (cell.data.temperature > 0 && Math.random() < 0.001) {
                cell.data.temperature -= 1;

                // Update visual color based on temperature (hot = brighter)
                if (cell.data.temperature > 70) {
                    // Very hot: dark red glow
                    cell.element.color = 0x1a0a14;
                } else if (cell.data.temperature > 40) {
                    // Warm: slight reddish tint
                    cell.element.color = 0x120a14;
                } else {
                    // Cool: normal dark purple-black
                    cell.element.color = 0x0a0a14;
                }
            }
        }

        return false;
    }
}

export default ObsidianElement;
