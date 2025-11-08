import { TAG } from './ElementProperties.js';

// InteractionManager - handles all element interactions based on properties
// Now supports priority system: lower priority number = higher priority
class InteractionManager {
    constructor() {
        this.interactions = [];
        this.registerDefaultInteractions();
    }

    // Register an interaction rule with optional priority (default: 10)
    registerInteraction(rule) {
        const interaction = {
            ...rule,
            priority: rule.priority !== undefined ? rule.priority : 10
        };
        this.interactions.push(interaction);
        // Sort by priority (lower number = higher priority)
        this.interactions.sort((a, b) => a.priority - b.priority);
    }

    // Register all default interaction rules
    registerDefaultInteractions() {
        // PRIORITY 0: CRITICAL - Lava + Water solidification
        this.registerInteraction({
            name: 'lava_water_solidification',
            priority: 0,
            check: (element1, element2) => {
                return (element1.hasTag(TAG.SOLIDIFIES_LAVA) && element2.hasTag(TAG.VERY_HOT)) ||
                       (element2.hasTag(TAG.SOLIDIFIES_LAVA) && element1.hasTag(TAG.VERY_HOT));
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which is water and which is lava
                const [waterX, waterY, lavaX, lavaY] = element1.hasTag(TAG.SOLIDIFIES_LAVA)
                    ? [x1, y1, x2, y2]
                    : [x2, y2, x1, y1];

                // Always evaporate the water first
                grid.setElement(waterX, waterY, registry.get('steam'));

                const lavaCell = grid.getCell(lavaX, lavaY);
                if (!lavaCell || !lavaCell.state) return true;

                // Check if this lava is at the surface (exposed to air/water above)
                const above = grid.getElement(lavaX, lavaY - 1);
                const isSurface = !above || above.id === 0 || above.name === 'water' || above.name === 'steam';

                // Only surface lava can form crust
                if (!isSurface) return true;

                // Track water contacts for THIS specific lava pixel
                const currentContacts = (lavaCell.state.data.waterContacts || 0) + 1;
                lavaCell.state.data.waterContacts = currentContacts;

                // After enough water contacts, solidify to stone crust
                // More aggressive: just 1 contact! Water cools lava surface quickly
                if (currentContacts >= 1) {
                    // Turn surface lava into immovable stone crust
                    grid.setElement(lavaX, lavaY, registry.get('stone'));
                    return true;
                }

                return true;
            }
        });

        // PRIORITY 5: COMBUSTION - heat_source + combustible → fire
        this.registerInteraction({
            name: 'ignition',
            priority: 5,
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

        // PRIORITY 10: EVAPORATION - liquid + heat_source → gas
        this.registerInteraction({
            name: 'evaporation',
            priority: 10,
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

        // WET SAND: water + sand → wet sand (happens quickly for realistic saturation)
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

                // 50% chance to convert sand to wet sand (increased from 30%)
                if (Math.random() > 0.5) {
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
