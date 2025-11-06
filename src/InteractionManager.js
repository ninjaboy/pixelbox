import { TAG } from './ElementProperties.js';

// InteractionManager - handles all element interactions based on properties
class InteractionManager {
    constructor() {
        this.interactions = [];
        this.registerDefaultInteractions();
    }

    // Register an interaction rule
    registerInteraction(rule) {
        this.interactions.push(rule);
    }

    // Register all default interaction rules
    registerDefaultInteractions() {
        // COMBUSTION: heat_source + combustible → fire
        this.registerInteraction({
            name: 'ignition',
            check: (element1, element2) => {
                return (element1.hasTag(TAG.HEAT_SOURCE) && element2.hasTag(TAG.COMBUSTIBLE)) ||
                       (element2.hasTag(TAG.HEAT_SOURCE) && element1.hasTag(TAG.COMBUSTIBLE));
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which is combustible
                const [combX, combY, combustible] = element1.hasTag(TAG.COMBUSTIBLE)
                    ? [x1, y1, element1]
                    : [x2, y2, element2];

                // Base ignition chance is 15%, reduced by ignitionResistance
                // ignitionResistance: 0 = easy to ignite (15%), 0.9 = very hard (1.5%)
                const baseChance = 0.15;
                const resistanceFactor = 1 - (combustible.ignitionResistance || 0);
                const ignitionChance = baseChance * resistanceFactor;

                if (Math.random() < ignitionChance) {
                    const newElement = combustible.burnsInto
                        ? registry.get(combustible.burnsInto)
                        : registry.get('fire');
                    grid.setElement(combX, combY, newElement);
                    return true;
                }
                return false;
            }
        });

        // EVAPORATION: liquid + heat_source → gas
        this.registerInteraction({
            name: 'evaporation',
            check: (element1, element2) => {
                return (element1.hasTag(TAG.EVAPORATES) && element2.hasTag(TAG.HEAT_SOURCE)) ||
                       (element2.hasTag(TAG.EVAPORATES) && element1.hasTag(TAG.HEAT_SOURCE));
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which evaporates
                const [evapX, evapY, evaporating] = element1.hasTag(TAG.EVAPORATES)
                    ? [x1, y1, element1]
                    : [x2, y2, element2];

                // Random chance to evaporate
                if (Math.random() > 0.9 && evaporating.evaporatesInto) {
                    const newElement = registry.get(evaporating.evaporatesInto);
                    grid.setElement(evapX, evapY, newElement);

                    // Also extinguish the heat source sometimes
                    const [heatX, heatY] = element1.hasTag(TAG.HEAT_SOURCE)
                        ? [x1, y1]
                        : [x2, y2];
                    if (Math.random() > 0.5) {
                        grid.setElement(heatX, heatY, registry.get('empty'));
                    }

                    return true;
                }
                return false;
            }
        });

        // OXIDATION: oxidizer + combustible → enhanced burning
        // (Could make fires burn hotter/faster)
        this.registerInteraction({
            name: 'oxidation',
            check: (element1, element2) => {
                return (element1.hasTag(TAG.OXIDIZER) && element2.hasTag(TAG.HEAT_SOURCE)) ||
                       (element2.hasTag(TAG.OXIDIZER) && element1.hasTag(TAG.HEAT_SOURCE));
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Could spawn more fire, increase temperature, etc.
                // For now, just a small chance to create more fire
                if (Math.random() > 0.95) {
                    const [oxX, oxY] = element1.hasTag(TAG.OXIDIZER)
                        ? [x1, y1]
                        : [x2, y2];
                    grid.setElement(oxX, oxY, registry.get('fire'));
                    return true;
                }
                return false;
            }
        });

        // WET SAND: water + sand → wet sand
        this.registerInteraction({
            name: 'wet_sand_formation',
            check: (element1, element2) => {
                return (element1.name === 'water' && element2.name === 'sand') ||
                       (element1.name === 'sand' && element2.name === 'water');
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which is sand
                const [sandX, sandY] = element1.name === 'sand'
                    ? [x1, y1]
                    : [x2, y2];

                // 30% chance to convert sand to wet sand
                if (Math.random() > 0.7) {
                    const wetSandElement = registry.get('wet_sand');
                    if (wetSandElement) {
                        grid.setElement(sandX, sandY, wetSandElement);
                        return true;
                    }
                }
                return false;
            }
        });

        // STEAM CONDENSATION: steam + cool surfaces → water
        this.registerInteraction({
            name: 'steam_condensation',
            check: (element1, element2) => {
                const coolSurfaces = ['stone', 'wood', 'sand', 'wet_sand'];
                return (element1.name === 'steam' && coolSurfaces.includes(element2.name)) ||
                       (element2.name === 'steam' && coolSurfaces.includes(element1.name));
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which is steam
                const [steamX, steamY] = element1.name === 'steam'
                    ? [x1, y1]
                    : [x2, y2];

                // 5% chance to condense back to water
                if (Math.random() > 0.95) {
                    const waterElement = registry.get('water');
                    if (waterElement) {
                        grid.setElement(steamX, steamY, waterElement);
                        return true;
                    }
                }
                return false;
            }
        });
    }

    // Check and apply interactions between two elements
    checkInteraction(element1, element2, grid, x1, y1, x2, y2, registry) {
        // First check if elements have custom interaction logic
        const customResult1 = element1.onInteract?.(element2, grid, x1, y1, x2, y2);
        if (customResult1) return true;

        const customResult2 = element2.onInteract?.(element1, grid, x2, y2, x1, y1);
        if (customResult2) return true;

        // Then check registered interaction rules
        for (const interaction of this.interactions) {
            if (interaction.check(element1, element2)) {
                if (interaction.apply(element1, element2, grid, x1, y1, x2, y2, registry)) {
                    return true;
                }
            }
        }

        return false;
    }
}

export default InteractionManager;
