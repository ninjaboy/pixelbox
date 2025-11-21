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
        // PRIORITY 0: CRITICAL - Lava + Water solidification (lava only, not obsidian)
        this.registerInteraction({
            name: 'lava_water_solidification',
            priority: 0,
            check: (element1, element2) => {
                // Only check for lava specifically, not all VERY_HOT elements
                return (element1.hasTag(TAG.SOLIDIFIES_LAVA) && element2.name === 'lava') ||
                       (element2.hasTag(TAG.SOLIDIFIES_LAVA) && element1.name === 'lava');
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which is water and which is lava
                const [waterX, waterY, lavaX, lavaY] = element1.hasTag(TAG.SOLIDIFIES_LAVA)
                    ? [x1, y1, x2, y2]
                    : [x2, y2, x1, y1];

                // Probabilistic stonification: 20% chance per contact
                if (Math.random() < 0.2) {
                    // Turn lava into stone (sinks naturally due to density: 10 > 2)
                    grid.setElement(lavaX, lavaY, registry.get('stone'));
                    // Water becomes steam
                    grid.setElement(waterX, waterY, registry.get('steam'));
                } else {
                    // Just evaporate the water without forming stone
                    grid.setElement(waterX, waterY, registry.get('steam'));
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

        // PRIORITY 7: FIRE EXTINGUISHING - water + fire → smoke/steam
        this.registerInteraction({
            name: 'fire_extinguishing',
            priority: 7,
            check: (element1, element2) => {
                return (element1.hasTag(TAG.EXTINGUISHES_FIRE) && element2.name === 'fire') ||
                       (element2.hasTag(TAG.EXTINGUISHES_FIRE) && element1.name === 'fire');
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                // Determine which is fire and which is water
                const [fireX, fireY] = element1.name === 'fire' ? [x1, y1] : [x2, y2];
                const [waterX, waterY] = element1.name === 'fire' ? [x2, y2] : [x1, y1];

                // Extinguish fire (70% chance)
                if (Math.random() < 0.7) {
                    // Fire is extinguished - becomes steam or empty (no smoke)
                    grid.setElement(fireX, fireY, Math.random() < 0.3 ? registry.get('steam') : registry.get('empty'));

                    // Water becomes steam (50% chance)
                    if (Math.random() < 0.5) {
                        grid.setElement(waterX, waterY, registry.get('steam'));
                    }
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
                // Determine which is sand and which is water
                const [sandX, sandY, waterX, waterY] = element1.name === 'sand'
                    ? [x1, y1, x2, y2]
                    : [x2, y2, x1, y1];

                // Check if water is DIRECTLY above the sand (same X coordinate, Y-1)
                const isWaterDirectlyAbove = (waterX === sandX && waterY === sandY - 1);

                // Check if sand is surrounded by water (fully submerged)
                // IMPORTANT: Only count actual WATER, not wet_sand, to prevent uncontrolled spreading
                const neighbors = [
                    grid.getElement(sandX, sandY - 1), // above
                    grid.getElement(sandX, sandY + 1), // below
                    grid.getElement(sandX - 1, sandY), // left
                    grid.getElement(sandX + 1, sandY)  // right
                ];
                const waterCount = neighbors.filter(n => n && n.name === 'water').length;
                const isSubmerged = waterCount >= 3; // 3+ sides covered by actual water

                // RULE: Sand only gets wet if:
                // 1. Water is DIRECTLY ABOVE it (same X, Y-1) - realistic seeping, OR
                // 2. Sand is fully submerged (3+ sides covered by actual WATER)
                // Sand touching water from the SIDE stays DRY
                // Sand touching only wet_sand (no water) stays DRY
                if (isWaterDirectlyAbove || isSubmerged) {
                    // MUCH lower conversion rate to prevent cascade (15% was way too high)
                    if (Math.random() > 0.95) { // Only 5% chance per frame
                        const wetSandElement = registry.get('wet_sand');
                        if (wetSandElement) {
                            grid.setElement(sandX, sandY, wetSandElement);
                            // Water rarely absorbs into sand (10% chance)
                            if (isWaterDirectlyAbove && Math.random() > 0.9) {
                                grid.setElement(waterX, waterY, registry.get('empty'));
                            }
                            return true;
                        }
                    }
                }
                return false;
            }
        });

        // STEAM-ICE CONDENSATION: steam + ice → water (rapid condensation on cold surface)
        this.registerInteraction({
            name: 'steam_ice_condensation',
            priority: 8,
            check: (element1, element2) => {
                return (element1.name === 'steam' && element2.name === 'ice') ||
                       (element2.name === 'steam' && element1.name === 'ice');
            },
            apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
                const [steamX, steamY] = element1.name === 'steam' ? [x1, y1] : [x2, y2];

                // 30% chance to condense to water (faster than regular condensation)
                if (Math.random() < 0.3) {
                    grid.setElement(steamX, steamY, registry.get('water'));
                    return true;
                }
                return false;
            }
        });

        // OIL-WATER SEPARATION: oil floats on water (density physics)
        this.registerInteraction({
            name: 'oil_water_separation',
            priority: 15,
            check: (element1, element2) => {
                return (element1.name === 'oil' && element2.name === 'water') ||
                       (element2.name === 'oil' && element1.name === 'water');
            },
            apply: (element1, element2, grid, x1, y1, x2, y2) => {
                const [oilX, oilY] = element1.name === 'oil' ? [x1, y1] : [x2, y2];
                const [waterX, waterY] = element1.name === 'oil' ? [x2, y2] : [x1, y1];

                // Oil floats: if oil is below water, swap them (20% chance for gradual effect)
                if (oilY > waterY && Math.random() < 0.2) {
                    grid.swap(oilX, oilY, waterX, waterY);
                    return true;
                }
                return false;
            }
        });

        // STEAM CONDENSATION: steam + cool surfaces → water
        this.registerInteraction({
            name: 'steam_condensation',
            priority: 16,
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
        // PERFORMANCE: Early exit for common non-interacting pairs
        // Empty space never interacts
        if (element1.id === 0 || element2.id === 0) return false;

        // PERFORMANCE: Early exit if both elements have no tags
        const e1HasTags = element1.tags && element1.tags.size > 0;
        const e2HasTags = element2.tags && element2.tags.size > 0;

        // If neither element has tags and no custom interaction logic, skip
        if (!e1HasTags && !e2HasTags && !element1.onInteract && !element2.onInteract) {
            return false;
        }

        // First check if elements have custom interaction logic
        const customResult1 = element1.onInteract?.(element2, grid, x1, y1, x2, y2);
        if (customResult1) return true;

        const customResult2 = element2.onInteract?.(element1, grid, x2, y2, x1, y1);
        if (customResult2) return true;

        // PERFORMANCE: Skip interaction rules if neither element has tags
        if (!e1HasTags && !e2HasTags) {
            return false;
        }

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
