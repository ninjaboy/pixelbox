import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';

class WaterElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.WATER, 'water', 0x0099ff, { // Brighter, more vibrant blue
            density: 2,
            state: STATE.LIQUID,
            dispersion: 3,
            evaporatesInto: 'steam',  // Transforms to steam when heated
            tags: new Set([TAG.EVAPORATES, TAG.SOLIDIFIES_LAVA, TAG.EXTINGUISHES_FIRE]),
            brushSize: 5, // Large pour brush
            emissionDensity: 1.0 // Continuous pour
        });

        // Use standardized liquid flow behavior
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 4,
            dispersionRate: 2,
            viscosity: 0, // Water is not viscous
            levelingEnabled: true
            // Removed avoidElements: water SHOULD touch lava to form crust via InteractionManager
        });
    }

    update(x, y, grid) {
        // Check for lava/obsidian contact FIRST - before any movement
        // This ensures water-lava interaction happens before water tries to displace lava
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighbor = grid.getElement(nx, ny);

            // LAVA INTERACTION
            if (neighbor && neighbor.name === 'lava') {
                // Check if lava is at surface (exposed to water/air above)
                const aboveLava = grid.getElement(nx, ny - 1);
                const isSurface = !aboveLava || aboveLava.id === 0 || aboveLava.name === 'water' || aboveLava.name === 'steam';

                // MUCH HIGHER CHANCE for complete crusting (was 20%, now 70%)
                if (Math.random() < 0.7) {
                    // Surface lava + water = stone crust
                    grid.setElement(nx, ny, grid.registry.get('stone'));
                    // Mark as crust so it stays in place
                    const crustCell = grid.getCell(nx, ny);
                    if (crustCell) {
                        crustCell.data.isCrust = true;
                    }
                    grid.setElement(x, y, grid.registry.get('steam'));
                    return true;
                } else {
                    // 30% chance: Evaporate without forming crust
                    grid.setElement(x, y, grid.registry.get('steam'));
                    return true;
                }
            }

            // OBSIDIAN COOLING MECHANIC
            if (neighbor && neighbor.name === 'obsidian') {
                const neighborCell = grid.getCell(nx, ny);

                // Initialize obsidian temperature tracking
                if (!neighborCell.data.temperature) {
                    neighborCell.data.temperature = 100; // Hot obsidian starts at 100
                }

                // Water above obsidian = cooling mechanism
                if (ny === y - 1) { // Water is above obsidian
                    // Cool down the obsidian
                    neighborCell.data.temperature -= 5;

                    // When obsidian gets cool enough, water stops evaporating and forms protective crust
                    if (neighborCell.data.temperature <= 20) {
                        // Cool obsidian: Form stone crust ABOVE it (where the water is)
                        if (Math.random() < 0.4) { // 40% chance to form crust
                            grid.setElement(x, y, grid.registry.get('stone'));
                            const crustCell = grid.getCell(x, y);
                            if (crustCell) {
                                crustCell.data.isCrust = true;
                            }
                            return true;
                        }
                        // Otherwise water stays as water (obsidian is cool now)
                        return false;
                    } else {
                        // Still hot: evaporate water
                        if (Math.random() < 0.3) { // 30% chance
                            grid.setElement(x, y, grid.registry.get('steam'));
                            return true;
                        }
                    }
                } else {
                    // Water on sides or below: evaporate if hot, otherwise interact normally
                    if (neighborCell.data.temperature > 50 && Math.random() < 0.2) {
                        grid.setElement(x, y, grid.registry.get('steam'));
                        return true;
                    }
                }
            }
        }

        // Surface evaporation (element-specific behavior)
        const above = grid.getElement(x, y - 1);
        if (above && above.id === 0) {
            const isAtSurface = this.isAtSurface(x, y, grid);
            if (isAtSurface && Math.random() < 0.0001) {
                grid.setElement(x, y, grid.registry.get('steam'));
                return true;
            }
        }

        // Seep through wet sand (permeability)
        const below = grid.getElement(x, y + 1);
        if (below && below.name === 'wet_sand') {
            const belowWetSand = grid.getElement(x, y + 2);
            if (belowWetSand && belowWetSand.id === 0 && Math.random() > 0.93) {
                grid.swap(x, y, x, y + 2);
                return true;
            }
        }

        // Delegate to standardized liquid flow behavior
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
