import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class FossilElement extends Element {
    constructor() {
        super(15, 'fossil', 0x8b7355, { // Gray-brown color
            density: 8,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 1.0, // Cannot burn (it's rock)
            tags: [TAG.ORGANIC], // Ancient organic matter
            brushSize: 1, // Single pixel brush
            emissionDensity: 1.0 // Place individual fossils
        });
    }

    updateImpl(x, y, grid) {
        // Fossils slowly generate oil (fossil fuel!)
        // Very rare - represents millions of years of pressure
        if (Math.random() > 0.9999) { // 0.01% chance per frame
            // Try to create oil in adjacent empty spaces
            const positions = [
                [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
            ];

            // Shuffle for randomness
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }

            for (const [ox, oy] of positions) {
                if (grid.isEmpty(ox, oy)) {
                    const oilElement = grid.registry.get('oil');
                    if (oilElement) {
                        grid.setElement(ox, oy, oilElement);
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

export default FossilElement;
