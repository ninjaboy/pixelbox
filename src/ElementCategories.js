/**
 * ElementCategories.js (v5.0.0)
 * Category definitions for the element picker UI.
 */

export const CATEGORIES = [
    { id: 'solids',  name: 'Solids',  icon: '\u25A0', order: 0 },   // filled square
    { id: 'powders', name: 'Powders', icon: '\u2234', order: 1 },   // therefore dots
    { id: 'liquids', name: 'Liquids', icon: '\u2248', order: 2 },   // approx waves
    { id: 'gases',   name: 'Gases',   icon: '\u2601', order: 3 },   // cloud
    { id: 'energy',  name: 'Energy',  icon: '\u2600', order: 4 },   // sun
    { id: 'life',    name: 'Life',    icon: '\u2618', order: 5 },   // shamrock
    { id: 'tools',   name: 'Tools',   icon: '\u2692', order: 6 },   // hammers
];

/**
 * Fallback category map for elements that don't specify a category property.
 */
export const ELEMENT_CATEGORY_MAP = {
    // Solids
    stone: 'solids', wood: 'solids', glass: 'solids', wall: 'solids',
    obsidian: 'solids', ice: 'solids', fossil: 'solids',

    // Powders
    sand: 'powders', gunpowder: 'powders', ash: 'powders',
    coal: 'powders', snow: 'powders', wet_sand: 'powders',
    wet_gunpowder: 'powders',

    // Liquids
    water: 'liquids', oil: 'liquids', lava: 'liquids', acid: 'liquids',
    slush: 'liquids',

    // Gases
    steam: 'gases', smoke: 'gases', steam_vent: 'gases', cloud: 'gases',

    // Energy
    fire: 'energy', burning_wood: 'energy', burning_coal: 'energy',
    electricity: 'energy',

    // Life
    tree_seed: 'life', vine: 'life', fish: 'life', bird: 'life',
    coral: 'life', grass_seed: 'life', house_seed: 'life',
    tree_trunk: 'life', tree_branch: 'life', leaf: 'life',
    fish_egg: 'life', bird_egg: 'life',

    // Special (not shown in picker)
    empty: 'special', player: 'special', light: 'special',

    // Tools
    eraser: 'tools',
};

/**
 * Get the category for an element.
 * Uses element.category if set, otherwise falls back to ELEMENT_CATEGORY_MAP.
 */
export function getElementCategory(element) {
    if (element.category) return element.category;
    return ELEMENT_CATEGORY_MAP[element.name] || 'solids';
}
