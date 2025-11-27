import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { WaterLavaInteractionBehavior } from '../behaviors/ElementInteractionBehaviors.js';
import { SurfaceFreezingBehavior } from '../behaviors/SeasonalBehaviors.js';

class WaterElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.WATER, 'water', 0x0099ff, { // Brighter, more vibrant blue
            density: 2,
            state: STATE.LIQUID,
            dispersion: 3,
            evaporatesInto: 'steam',  // Transforms to steam when heated
            tags: new Set([TAG.EVAPORATES, TAG.SOLIDIFIES_LAVA, TAG.EXTINGUISHES_FIRE, TAG.CONDUCTIVE]),
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });

        // Behavior 1: Surface freezing in winter (v4.0.0)
        this.addBehavior(new SurfaceFreezingBehavior());

        // Behavior 2: Obsidian cooling interaction (lava interaction handled by InteractionManager)
        this.addBehavior(new WaterLavaInteractionBehavior({
            obsidianCoolRate: 5,
            obsidianCoolThreshold: 20,
            obsidianCrustChance: 0.4,
            hotObsidianEvaporateChance: 0.3
        }));

        // Use standardized liquid flow behavior
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 4,
            dispersionRate: 3, // Increased from 2 for faster spreading
            viscosity: 0, // Water is not viscous
            levelingEnabled: true
        });
    }

    updateImpl(x, y, grid) {
        // PRIORITY 1: Check for lava/obsidian interactions
        const interactionResult = this.applyBehaviors(x, y, grid);
        if (interactionResult) return true;

        // PRIORITY 2: Surface evaporation (element-specific behavior)
        // v4.1.8: Seasonal evaporation - much higher in summer to balance winter snow
        const above = grid.getElement(x, y - 1);
        if (above && above.id === 0) {
            const isAtSurface = this.isAtSurface(x, y, grid);
            if (isAtSurface) {
                // Get seasonal evaporation multiplier
                const seasonData = grid.seasonData;
                let evapMultiplier = 1.0;
                if (seasonData) {
                    const season = seasonData.season;
                    // Seasonal evaporation rates: summer is 50x to balance winter snow
                    const evapRates = {
                        spring: 2.0,
                        summer: 50.0,  // Aggressive evaporation to balance winter snow
                        autumn: 1.0,
                        winter: 0.1
                    };
                    evapMultiplier = evapRates[season] || 1.0;

                    // Additional boost in hot temperatures
                    if (seasonData.temperature > 0.7) {
                        evapMultiplier *= 1.5;
                    }
                }

                // Base evaporation 0.01% (0.0001) * seasonal multiplier
                const evapChance = 0.0001 * evapMultiplier;
                if (Math.random() < evapChance) {
                    grid.setElement(x, y, grid.registry.get('steam'));
                    return true;
                }
            }
        }

        // PRIORITY 3: Seep through wet sand (permeability)
        const below = grid.getElement(x, y + 1);
        if (below && below.name === 'wet_sand') {
            const belowWetSand = grid.getElement(x, y + 2);
            if (belowWetSand && belowWetSand.id === 0 && Math.random() > 0.93) {
                grid.swap(x, y, x, y + 2);
                return true;
            }
        }

        // PRIORITY 4: Delegate to standardized liquid flow behavior
        return this.movement.apply(x, y, grid);
    }

    // Check if water is at the surface (top edge of water body)
    isAtSurface(x, y, grid) {
        const above = grid.getElement(x, y - 1);
        if (!above || above.id !== 0) {
            return false; // Not at surface if something is above
        }

        // Also check if there's water or solid below (not floating in air)
        const below = grid.getElement(x, y + 1);
        if (!below || below.id === 0) {
            // Check diagonal support
            const belowLeft = grid.getElement(x - 1, y + 1);
            const belowRight = grid.getElement(x + 1, y + 1);

            // At surface if it has support below or to the sides
            return (below && below.id !== 0) ||
                   (belowLeft && belowLeft.name === 'water') ||
                   (belowRight && belowRight.name === 'water');
        }

        return true;
    }
}

export default WaterElement;
