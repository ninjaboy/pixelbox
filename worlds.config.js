// Pre-made World URLs Configuration
// =====================================
//
// To add a pre-made world:
// 1. Build your world in the game
// 2. Click ☰ menu → Export Game
// 3. Copy the 0x0.st URL from the alert
// 4. Paste it below with a name and icon
//
// Format:
// {
//     name: 'World Name',
//     icon: '🌍',  // Single emoji
//     url: 'https://0x0.st/xxxxx.json',  // Your 0x0.st URL
//     description: 'Short description'
// }

export const PREMADE_WORLDS = [
    // EXAMPLE - Replace with your actual world URLs
    {
        name: 'Island Paradise',
        icon: '🏝️',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Tropical island with palm trees and ocean'
    },
    {
        name: 'Desert Oasis',
        icon: '🏜️',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Sandy dunes with a hidden water pool'
    },
    {
        name: 'Volcanic Caves',
        icon: '🌋',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Dangerous lava flows and fire geysers'
    },
    {
        name: 'Frozen Lake',
        icon: '❄️',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Ice formations over deep water'
    },
    {
        name: 'Jungle Valley',
        icon: '🌲',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Dense forest with rivers and wildlife'
    },
    {
        name: 'Mountain Peak',
        icon: '⛰️',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Rocky cliffs and cascading waterfalls'
    },
    {
        name: 'Underground Cavern',
        icon: '🕳️',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Dark caves with hidden treasures'
    },
    {
        name: 'Coral Reef',
        icon: '🪸',
        url: null, // ⬅️ PASTE 0x0.st URL HERE
        description: 'Underwater ecosystem full of life'
    }
];

// Helper: Get only worlds with valid URLs
export function getAvailableWorlds() {
    return PREMADE_WORLDS.filter(world => world.url !== null && world.url.trim() !== '');
}

// Helper: Load a world by name
export async function loadWorldByName(name, worldSerializer) {
    const world = PREMADE_WORLDS.find(w => w.name === name);
    if (!world || !world.url) {
        throw new Error(`World "${name}" not found or has no URL`);
    }

    return await worldSerializer.downloadWorld(world.url);
}
