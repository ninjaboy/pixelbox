/**
 * ElementTiers.js - Freemium element configuration
 * Defines which elements are free vs premium (requires $2 unlock)
 */

/**
 * FREE TIER - 10 core elements
 * Enough to experiment with basic physics, create simple scenes,
 * and understand the game mechanics. Designed to showcase the app
 * without giving away all the premium features.
 */
export const FREE_ELEMENTS = [
    'empty',        // Essential for erasing
    'sand',         // Basic powder physics
    'water',        // Basic liquid physics
    'fire',         // Heat/combustion intro
    'stone',        // Basic solid
    'tree_seed',    // Living/growth mechanic preview
    'snow',         // Seasonal preview
    'cloud',        // Weather preview
    'steam',        // Element transformation preview
    'wall',         // Building/containment
];

/**
 * PREMIUM TIER - 34 elements
 * Requires $2 IAP unlock. Includes all advanced elements,
 * living creatures, special materials, and complex interactions.
 */
export const PREMIUM_ELEMENTS = [
    // Advanced Liquids
    'oil',          // Flammable liquid
    'lava',         // Hot liquid
    'acid',         // Corrosive liquid
    'slush',        // Winter liquid

    // Advanced Powders
    'gunpowder',    // Explosive
    'ash',          // Byproduct
    'wet_sand',     // Beach/coast
    'wet_gunpowder', // Explosive variant

    // Advanced Solids
    'wood',         // Burnable solid
    'burning_wood', // Fire spread
    'ice',          // Frozen water
    'glass',        // Transparent solid
    'coal',         // Fuel

    // Living Creatures
    'fish',         // Aquatic life
    'bird',         // Flying life
    'coral',        // Growing life

    // Plants/Organic
    'tree_trunk',   // Tree structure
    'tree_branch',  // Tree structure
    'leaf',         // Foliage
    'vine',         // Growing plant

    // Builders/Spawners
    'house_seed',   // Structure builder
    'steam_vent',   // Steam spawner

    // Special/Advanced
    'electricity',  // Lightning/energy
    'fossil',       // Ancient material
    'smoke',        // Visual effect
    'light',        // Illumination

    // Placeholders for future elements
    'player',       // Explore mode character
    'eraser',       // Large erase tool
];

/**
 * Check if an element is free (unlocked by default)
 * @param {string} elementName - Name of the element
 * @returns {boolean} True if element is free
 */
export function isFreeElement(elementName) {
    return FREE_ELEMENTS.includes(elementName);
}

/**
 * Check if an element requires premium unlock
 * @param {string} elementName - Name of the element
 * @returns {boolean} True if element is premium
 */
export function isPremiumElement(elementName) {
    return PREMIUM_ELEMENTS.includes(elementName);
}

/**
 * Get element tier ('free', 'premium', or 'unknown')
 * @param {string} elementName - Name of the element
 * @returns {string} Element tier
 */
export function getElementTier(elementName) {
    if (isFreeElement(elementName)) return 'free';
    if (isPremiumElement(elementName)) return 'premium';
    return 'unknown';
}

/**
 * Get all element names by tier
 * @param {string} tier - 'free' or 'premium'
 * @returns {Array<string>} Array of element names
 */
export function getElementsByTier(tier) {
    if (tier === 'free') return [...FREE_ELEMENTS];
    if (tier === 'premium') return [...PREMIUM_ELEMENTS];
    return [];
}

/**
 * Get total count of elements by tier
 */
export const TIER_COUNTS = {
    free: FREE_ELEMENTS.length,      // 10
    premium: PREMIUM_ELEMENTS.length, // 34
    total: FREE_ELEMENTS.length + PREMIUM_ELEMENTS.length // 44
};

/**
 * Pricing information
 */
export const PRICING = {
    premiumUnlockPrice: 1.99,        // $1.99 USD
    currency: 'USD',
    productId: 'com.pixelbox.premium_unlock', // App Store product ID
    displayPrice: '$2',              // Display string
};

/**
 * Free tier benefits description (for unlock modal)
 */
export const FREE_TIER_BENEFITS = [
    '✓ 10 core elements',
    '✓ Basic physics sandbox',
    '✓ Seasons & weather',
    '✓ Build & explore modes',
    '✓ Save/load worlds locally'
];

/**
 * Premium tier benefits description (for unlock modal)
 */
export const PREMIUM_TIER_BENEFITS = [
    '🔓 Unlock 34+ premium elements',
    '🐟 Living creatures (fish, birds)',
    '🏠 House builder & structures',
    '⚡ Advanced materials (electricity, lava, acid)',
    '💥 Explosives & special effects',
    '🌳 Full ecosystem (trees, leaves, vines)',
    '❄️ All seasonal elements',
    '🎨 Complete creative freedom'
];
