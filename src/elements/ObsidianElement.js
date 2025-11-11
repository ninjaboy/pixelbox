import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class ObsidianElement extends Element {
    constructor() {
        super(32, 'obsidian', 0x0a0a14, { // Very dark purple-black
            density: 10, // Very heavy, like stone - sinks through water
            state: STATE.SOLID,
            movable: true, // Can fall and sink through water
            ignitionResistance: 1.0, // Cannot burn
            tags: [TAG.MINERAL], // TAG.VERY_HOT added dynamically when hot
            brushSize: 2,
            emissionDensity: 0.8
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // PRIORITY 1: Temperature tracking and cooling
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

        // PRIORITY 2: Movement - obsidian always tries to fall through water and other obsidian
        const below = grid.getElement(x, y + 1);
        if (!below) return false;

        // Can fall into empty space
        if (below.id === 0) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Can displace liquids (water, lava, oil) - sink through them
        if (below.state === 'liquid' && this.density > below.density) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // SPECIAL: Newly formed hot obsidian can displace other obsidian/stone to settle
        // This prevents traffic jams when lava hits water
        const isHot = cell.data.temperature !== undefined && cell.data.temperature > 50;
        if (isHot && (below.name === 'obsidian' || below.name === 'stone')) {
            // Hot obsidian pushes aside cooler obsidian/stone (10% chance to prevent infinite loops)
            if (Math.random() < 0.1) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
        }

        // Can't move through solids - settled
        return false;
    }
}

export default ObsidianElement;
