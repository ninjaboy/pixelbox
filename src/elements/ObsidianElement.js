import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';
import { GravityBehavior } from '../behaviors/MovementBehaviors.js';

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

        // Use gravity behavior - obsidian falls like stone
        this.movement = new GravityBehavior({
            fallSpeed: 1,
            slideAngle: false, // Doesn't slide, just falls straight
            slideStability: 1.0 // Very stable, no sliding
        });
    }

    updateImpl(x, y, grid) {
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

        // Movement: Fall straight down (sinks through water due to high density)
        return this.movement.apply(x, y, grid);
    }
}

export default ObsidianElement;
