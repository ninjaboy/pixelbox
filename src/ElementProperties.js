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
    COMBUSTIBLE: 'combustible',      // Can catch fire
    HEAT_SOURCE: 'heat_source',      // Emits heat/fire
    OXIDIZER: 'oxidizer',            // Helps combustion
    EVAPORATES: 'evaporates',        // Can turn to gas when heated
    CONDENSES: 'condenses',          // Can turn to liquid when cooled
    DISSOLVES: 'dissolves',          // Can dissolve in liquids
    CONDUCTIVE: 'conductive',        // Conducts electricity
    CORROSIVE: 'corrosive',          // Can corrode other materials
    ORGANIC: 'organic',              // Organic material
    EXPLOSIVE: 'explosive'           // Can explode
};

export { STATE, TEMPERATURE, TAG };
