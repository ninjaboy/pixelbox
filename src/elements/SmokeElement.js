import Element from '../Element.js';
import { STATE, ELEMENT_TYPE } from '../ElementProperties.js';
import { GasBehavior } from '../behaviors/MovementBehaviors.js';

class SmokeElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.SMOKE, 'smoke', 0x555555, {
            density: 0,
            state: STATE.GAS,
            dispersion: 3,
            lifetime: 30, // Base lifetime (0.5 seconds)
            tags: new Set()
        });

        // Define atmosphere boundary (upper 40% of screen - same as clouds/steam)
        this.atmosphereThreshold = 0.40;

        // Use standardized gas behavior
        this.movement = new GasBehavior({
            riseSpeed: 0.6, // 60% chance to rise (slower than steam)
            spreadRate: 0.4, // 40% sideways spread (billowing effect)
            dissipation: false // Lifetime handles dissipation
        });

        // Alternative behavior for atmosphere (slower rise, more spread)
        this.atmosphereMovement = new GasBehavior({
            riseSpeed: 0.15, // Very slow rise in atmosphere
            spreadRate: 0.7, // Heavy sideways drift
            dissipation: false
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if we're in the atmosphere layer
        const atmosphereHeight = Math.floor(grid.height * this.atmosphereThreshold);
        const inAtmosphere = y < atmosphereHeight;

        // NO LIFETIME EXTENSION - let smoke dissipate naturally at same rate everywhere

        // Use different movement behavior based on altitude
        if (inAtmosphere) {
            // In atmosphere: use slow-rise, high-spread behavior
            return this.atmosphereMovement.apply(x, y, grid);
        } else {
            // Below atmosphere: use standard smoke behavior
            return this.movement.apply(x, y, grid);
        }
    }
}

export default SmokeElement;
