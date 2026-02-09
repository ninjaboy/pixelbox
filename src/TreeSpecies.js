/**
 * TreeSpecies.js - Defines different tree species with unique growth parameters
 *
 * Each species overrides the base TREE_CONFIG to produce distinct tree shapes:
 * - Oak: Wide, rounded canopy with thick trunk
 * - Birch: Tall, slender with sparse branching
 * - Pine: Conical shape with upward-angled branches
 * - Palm: Tall bare trunk with fan of fronds at top
 */

const TREE_SPECIES = {
    oak: {
        name: 'oak',
        initialLength: () => 6 + Math.random() * 6,       // 6-12
        maxDepth: () => 4 + Math.floor(Math.random() * 2), // 4-5 levels (bushy)
        lengthReduction: () => 0.55 + Math.random() * 0.20, // 55-75%
        minBranchAngle: 30 * Math.PI / 180,
        maxBranchAngle: 60 * Math.PI / 180,
        asymmetryVariation: 25 * Math.PI / 180,
        branchSkipChance: 0.15,      // Low skip = denser canopy
        minLeafDepth: 2,
        leavesPerTerminal: 4,        // More leaves per endpoint
        leafSpreadRadius: 2,         // Larger leaf clusters
        trunkColor: 0x5a3a1a,        // Dark brown
        branchColor: 0x7a5a3a,       // Medium brown
        leafColors: {
            spring: [0x90EE90, 0x7CFC00, 0x98FB98],
            summer: [0x228B22, 0x2E8B57, 0x006400],
            autumn: [0xFF8C00, 0xFF6347, 0xDC143C, 0xFFD700],
            winter: [0x8B7355],
        },
        // Growth direction bias: slight spread outward
        trunkAngleVariation: 5 * Math.PI / 180,
        // Collision: try to route around obstacles
        collisionBehavior: 'route_around',
    },

    birch: {
        name: 'birch',
        initialLength: () => 8 + Math.random() * 7,       // 8-15 (tall)
        maxDepth: () => 3 + Math.floor(Math.random() * 2), // 3-4 levels
        lengthReduction: () => 0.45 + Math.random() * 0.15, // 45-60% (shorter branches)
        minBranchAngle: 20 * Math.PI / 180,
        maxBranchAngle: 40 * Math.PI / 180,                 // Narrow angles
        asymmetryVariation: 15 * Math.PI / 180,
        branchSkipChance: 0.35,      // More sparse
        minLeafDepth: 2,
        leavesPerTerminal: 3,
        leafSpreadRadius: 1,
        trunkColor: 0xE8E0D0,        // White/cream (birch bark)
        branchColor: 0xC8B8A0,       // Light tan
        leafColors: {
            spring: [0xADFF2F, 0x9ACD32, 0xBBFF44],
            summer: [0x6B8E23, 0x556B2F, 0x8FBC8F],
            autumn: [0xFFD700, 0xFFC125, 0xFFEC8B, 0xEEDD82],
            winter: [0x8B8378],
        },
        trunkAngleVariation: 3 * Math.PI / 180,
        collisionBehavior: 'stop',
    },

    pine: {
        name: 'pine',
        initialLength: () => 9 + Math.random() * 8,       // 9-17 (tallest)
        maxDepth: () => 4 + Math.floor(Math.random() * 2), // 4-5 levels
        lengthReduction: () => 0.40 + Math.random() * 0.15, // 40-55% (decreasing branches)
        minBranchAngle: 40 * Math.PI / 180,
        maxBranchAngle: 70 * Math.PI / 180,                 // Wide, downward-sloping
        asymmetryVariation: 10 * Math.PI / 180,
        branchSkipChance: 0.10,       // Dense branches
        minLeafDepth: 1,             // Needles even on lower branches
        leavesPerTerminal: 3,
        leafSpreadRadius: 1,
        trunkColor: 0x5C4033,         // Reddish-brown
        branchColor: 0x6B4F3A,
        leafColors: {
            spring: [0x228B22, 0x2E8B57, 0x3CB371],
            summer: [0x006400, 0x005500, 0x194D19],           // Dark evergreen
            autumn: [0x2E5E1E, 0x355E3B, 0x4A7A3D],          // Stays green, slightly muted
            winter: [0x1C3A1C, 0x2D4A2D],                     // Dark green (evergreen)
        },
        trunkAngleVariation: 2 * Math.PI / 180,              // Very straight trunk
        collisionBehavior: 'stop',
        // Pine-specific: branches get shorter higher up (conical shape)
        depthLengthScale: [1.0, 0.9, 0.7, 0.5, 0.3],
        // Pine needles don't fall in autumn/winter
        evergreenLeaves: true,
    },

    palm: {
        name: 'palm',
        initialLength: () => 10 + Math.random() * 8,      // 10-18 (tall trunk)
        maxDepth: () => 2,                                  // Only 2 levels (trunk + fronds)
        lengthReduction: () => 0.50 + Math.random() * 0.15, // 50-65%
        minBranchAngle: 25 * Math.PI / 180,
        maxBranchAngle: 80 * Math.PI / 180,                  // Very wide fronds
        asymmetryVariation: 15 * Math.PI / 180,
        branchSkipChance: 0.0,         // Never skip — all fronds
        minLeafDepth: 1,
        leavesPerTerminal: 4,
        leafSpreadRadius: 2,
        trunkColor: 0x8B7355,          // Sandy brown
        branchColor: 0x6B8E23,         // Olive green (fronds are green)
        leafColors: {
            spring: [0x32CD32, 0x3CB371, 0x66CD00],
            summer: [0x228B22, 0x2E8B57, 0x008B00],
            autumn: [0x2E8B57, 0x3CB371, 0x458B00],           // Stays green
            winter: [0x3B6B3B, 0x4A7A4A],                     // Slightly darker
        },
        trunkAngleVariation: 4 * Math.PI / 180,
        collisionBehavior: 'route_around',
        // Palm-specific: no branching on trunk, only at top
        branchOnlyAtTop: true,
        // Palm fronds: more branches at the crown
        crownBranchCount: 5,
        evergreenLeaves: true,
    },
};

// Weighted random selection — oak and pine more common
const SPECIES_WEIGHTS = [
    { species: 'oak', weight: 35 },
    { species: 'birch', weight: 25 },
    { species: 'pine', weight: 25 },
    { species: 'palm', weight: 15 },
];

function getRandomSpecies() {
    const totalWeight = SPECIES_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of SPECIES_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) {
            return TREE_SPECIES[entry.species];
        }
    }
    return TREE_SPECIES.oak; // fallback
}

export { TREE_SPECIES, getRandomSpecies };
