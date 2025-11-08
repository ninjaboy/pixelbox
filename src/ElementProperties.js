// Element property definitions for dynamic interactions

// Physical states
const STATE = {
    EMPTY: 'empty',
    SOLID: 'solid',
    POWDER: 'powder',
    LIQUID: 'liquid',
    GAS: 'gas'
};

// Temperature classifications
const TEMPERATURE = {
    COLD: -1,
    NORMAL: 0,
    WARM: 1,
    HOT: 2,
    VERY_HOT: 3
};

// Element tags for interactions
const TAG = {
    // Thermal tags
    COMBUSTIBLE: 'combustible',      // Can catch fire
    HEAT_SOURCE: 'heat_source',      // Emits heat/fire
    VERY_HOT: 'very_hot',            // Extremely hot (lava, magma)
    FREEZING: 'freezing',            // Extremely cold (ice)

    // Chemical tags
    OXIDIZER: 'oxidizer',            // Helps combustion
    EXPLOSIVE: 'explosive',          // Can explode
    CORROSIVE: 'corrosive',          // Can corrode other materials
    DISSOLVES: 'dissolves',          // Can dissolve in liquids

    // State change tags
    EVAPORATES: 'evaporates',        // Can turn to gas when heated
    CONDENSES: 'condenses',          // Can turn to liquid when cooled
    MELTS: 'melts',                  // Can melt when heated
    SOLIDIFIES: 'solidifies',        // Can solidify when cooled
    SOLIDIFIES_LAVA: 'solidifies_lava', // Turns lava into stone (water)

    // Material tags
    ORGANIC: 'organic',              // Organic material
    MINERAL: 'mineral',              // Mineral/stone material
    METALLIC: 'metallic',            // Metal material
    LIQUID_STATE: 'liquid_state',    // Alternative liquid marker

    // Physical properties
    CONDUCTIVE: 'conductive',        // Conducts electricity/heat
    TRANSPARENT: 'transparent',      // See-through material
    PERMEABLE: 'permeable',          // Allows liquids to pass
    IMPERMEABLE: 'impermeable',      // Blocks liquid flow

    // Interaction tags
    EXTINGUISHES_FIRE: 'extinguishes_fire', // Can put out fires (water)
};

// Element type ID constants (for type checking without name comparison)
const ELEMENT_TYPE = {
    EMPTY: 0,
    SAND: 1,
    WATER: 2,
    STONE: 3,
    FIRE: 4,
    WOOD: 5,
    STEAM: 6,
    OIL: 7,
    SMOKE: 8,
    BURNING_WOOD: 9,
    ASH: 10,
    TREE_TRUNK: 11,
    TREE_BRANCH: 12,
    LEAF: 13,
    GUNPOWDER: 14,
    WET_GUNPOWDER: 15,
    FOSSIL: 16,
    FISH: 17,
    WET_SAND: 18,
    WALL: 19,
    CLOUD: 20,
    TREE_SEED: 21,
    LAVA: 22,
    ACID: 23,
    PLAYER: 24,
    ICE: 25,
    SALT: 26,
    GLASS: 27,
    PLANT: 28,
};

export { STATE, TEMPERATURE, TAG, ELEMENT_TYPE };
