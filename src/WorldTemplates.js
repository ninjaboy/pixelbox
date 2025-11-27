// WorldTemplates - Pre-built world generators
// Each template creates a unique biome with proper 2D physics containment

export default class WorldTemplates {
    constructor(gameScene) {
        this.gameScene = gameScene;
        this.templates = this.defineTemplates();
    }

    defineTemplates() {
        return {
            // ==========================================
            // 🏝️ ISLAND PARADISE
            // ==========================================
            island: {
                name: 'Island Paradise',
                icon: '🏝️',
                description: 'Ocean world with central island, palm trees, and fish',

                // PASTE YOUR CUSTOM TEMPLATE CODE HERE (base64 string)
                customCode: null,
                // Example: customCode: 'MTAwLDEwMHwwLDAsMCwwLDAsMCwwLDAsMCww...'

                generate: (scene) => {
                    if (this.customCode) {
                        // Load from custom template code
                        scene.worldSerializer.deserializeWorld(this.customCode);
                    } else {
                        // Use procedural generator
                        this.generateIslandParadise(scene);
                    }
                }
            },

            // ==========================================
            // 🏜️ DESERT CANYON
            // ==========================================
            desert: {
                name: 'Desert Canyon',
                icon: '🏜️',
                description: 'Layered sand dunes with stone cliffs and rare water',

                // PASTE YOUR CUSTOM TEMPLATE CODE HERE (base64 string)
                customCode: null,
                // Example: customCode: 'MTAwLDEwMHwwLDAsMCwwLDAsMCwwLDAsMCww...'

                generate: (scene) => {
                    if (this.customCode) {
                        scene.worldSerializer.deserializeWorld(this.customCode);
                    } else {
                        this.generateDesertCanyon(scene);
                    }
                }
            },

            // ==========================================
            // 🌋 VOLCANIC HELL
            // ==========================================
            volcanic: {
                name: 'Volcanic Hell',
                icon: '🌋',
                description: 'Lava pools, fire vents, and charred stone',

                // PASTE YOUR CUSTOM TEMPLATE CODE HERE (base64 string)
                customCode: null,
                // Example: customCode: 'MTAwLDEwMHwwLDAsMCwwLDAsMCwwLDAsMCww...'

                generate: (scene) => {
                    if (this.customCode) {
                        scene.worldSerializer.deserializeWorld(this.customCode);
                    } else {
                        this.generateVolcanicHell(scene);
                    }
                }
            },

            // ==========================================
            // ❄️ FROZEN TUNDRA
            // ==========================================
            frozen: {
                name: 'Frozen Tundra',
                icon: '❄️',
                description: 'Ice formations with frozen water pockets',

                // PASTE YOUR CUSTOM TEMPLATE CODE HERE (base64 string)
                customCode: null,
                // Example: customCode: 'MTAwLDEwMHwwLDAsMCwwLDAsMCwwLDAsMCww...'

                generate: (scene) => {
                    if (this.customCode) {
                        scene.worldSerializer.deserializeWorld(this.customCode);
                    } else {
                        this.generateFrozenTundra(scene);
                    }
                }
            },

            // ==========================================
            // 🌲 FOREST VALLEY
            // ==========================================
            forest: {
                name: 'Forest Valley',
                icon: '🌲',
                description: 'Dense trees, plants, and flowing water streams',

                // PASTE YOUR CUSTOM TEMPLATE CODE HERE (base64 string)
                customCode: null,
                // Example: customCode: 'MTAwLDEwMHwwLDAsMCwwLDAsMCwwLDAsMCww...'

                generate: (scene) => {
                    if (this.customCode) {
                        scene.worldSerializer.deserializeWorld(this.customCode);
                    } else {
                        this.generateForestValley(scene);
                    }
                }
            }
        };
    }

    getTemplate(id) {
        return this.templates[id];
    }

    getAllTemplates() {
        return this.templates;
    }

    // ============================================
    // PROCEDURAL GENERATORS (FALLBACK)
    // ============================================

    generateIslandParadise(scene) {
        const grid = scene.pixelGrid;
        const water = scene.elementRegistry.get('water');
        const sand = scene.elementRegistry.get('sand');
        const stone = scene.elementRegistry.get('stone');
        const wall = scene.elementRegistry.get('wall');
        const treeSeed = scene.elementRegistry.get('tree_seed');
        const fish = scene.elementRegistry.get('fish');

        const waterLevel = Math.floor(grid.height * 0.65);
        const oceanDepth = 25;

        // 1. BUILD OCEAN BASIN
        const leftWallX = 10;
        const rightWallX = grid.width - 10;

        for (let y = waterLevel; y < grid.height - 3; y++) {
            for (let t = 0; t < 5; t++) {
                grid.setElement(leftWallX + t, y, wall);
                grid.setElement(rightWallX - t, y, wall);
            }
        }

        for (let x = leftWallX + 5; x < rightWallX - 5; x++) {
            for (let y = waterLevel + oceanDepth; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
        }

        // 2. FILL WITH WATER
        for (let x = leftWallX + 5; x < rightWallX - 5; x++) {
            for (let y = waterLevel; y < waterLevel + oceanDepth; y++) {
                grid.setElement(x, y, water);
            }
        }

        // 3. BUILD ISLAND PLATFORM
        const islandCenterX = Math.floor(grid.width / 2);
        const islandWidth = 40;
        const islandTop = waterLevel - 8;

        for (let x = islandCenterX - islandWidth / 2; x < islandCenterX + islandWidth / 2; x++) {
            for (let y = islandTop + 10; y < waterLevel + 15; y++) {
                grid.setElement(x, y, stone);
            }
        }

        for (let x = islandCenterX - islandWidth / 2; x < islandCenterX + islandWidth / 2; x++) {
            const beachHeight = 3 + Math.floor(Math.random() * 3);
            for (let y = islandTop; y < islandTop + beachHeight; y++) {
                grid.setElement(x, y, sand);
            }
        }

        // 4. PLANT PALM TREES
        for (let i = 0; i < 6; i++) {
            const spacing = islandWidth / 7;
            const treeX = Math.floor(islandCenterX - islandWidth / 2 + spacing * (i + 1));
            const treeY = islandTop - 1;
            grid.setElement(treeX, treeY, treeSeed);
        }

        // 5. ADD FISH
        for (let i = 0; i < 20; i++) {
            const fishX = leftWallX + 10 + Math.floor(Math.random() * (rightWallX - leftWallX - 20));
            const fishY = waterLevel + 5 + Math.floor(Math.random() * (oceanDepth - 10));
            if (fishX < islandCenterX - islandWidth / 2 || fishX > islandCenterX + islandWidth / 2) {
                grid.setElement(fishX, fishY, fish);
            }
        }

    }

    generateDesertCanyon(scene) {
        const grid = scene.pixelGrid;
        const sand = scene.elementRegistry.get('sand');
        const stone = scene.elementRegistry.get('stone');
        const wall = scene.elementRegistry.get('wall');
        const water = scene.elementRegistry.get('water');

        const canyonFloor = Math.floor(grid.height * 0.75);
        const plateauHeight = Math.floor(grid.height * 0.45);
        const canyonWidth = 50;
        const canyonCenterX = Math.floor(grid.width / 2);

        // 1. BUILD LEFT PLATEAU
        const leftPlateauEnd = canyonCenterX - canyonWidth / 2;
        for (let x = 3; x < leftPlateauEnd; x++) {
            for (let y = plateauHeight + 15; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
            const sandDepth = 8 + Math.floor(Math.random() * 5);
            for (let y = plateauHeight; y < plateauHeight + sandDepth; y++) {
                grid.setElement(x, y, sand);
            }
        }

        // 2. BUILD RIGHT PLATEAU
        const rightPlateauStart = canyonCenterX + canyonWidth / 2;
        for (let x = rightPlateauStart; x < grid.width - 3; x++) {
            for (let y = plateauHeight + 15; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
            const sandDepth = 8 + Math.floor(Math.random() * 5);
            for (let y = plateauHeight; y < plateauHeight + sandDepth; y++) {
                grid.setElement(x, y, sand);
            }
        }

        // 3. BUILD CANYON FLOOR
        for (let x = leftPlateauEnd; x < rightPlateauStart; x++) {
            for (let y = canyonFloor + 10; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
        }

        // 4. ADD WATER POOL
        const poolWidth = 20;
        const poolCenterX = canyonCenterX;
        const poolDepth = 8;
        const poolBottom = canyonFloor + 10;

        for (let y = poolBottom - poolDepth; y <= poolBottom; y++) {
            grid.setElement(poolCenterX - poolWidth / 2 - 2, y, wall);
            grid.setElement(poolCenterX + poolWidth / 2 + 2, y, wall);
        }

        for (let x = poolCenterX - poolWidth / 2; x <= poolCenterX + poolWidth / 2; x++) {
            grid.setElement(x, poolBottom, stone);
        }

        for (let x = poolCenterX - poolWidth / 2; x <= poolCenterX + poolWidth / 2; x++) {
            for (let y = poolBottom - poolDepth; y < poolBottom; y++) {
                grid.setElement(x, y, water);
            }
        }

        // 5. ADD SAND SLOPES
        for (let i = 0; i < 15; i++) {
            const slopeX = leftPlateauEnd - i;
            const slopeY = plateauHeight + 15 + i * 2;
            for (let dy = 0; dy < 10; dy++) {
                if (slopeY + dy < canyonFloor) {
                    grid.setElement(slopeX, slopeY + dy, sand);
                }
            }
        }

        for (let i = 0; i < 15; i++) {
            const slopeX = rightPlateauStart + i;
            const slopeY = plateauHeight + 15 + i * 2;
            for (let dy = 0; dy < 10; dy++) {
                if (slopeY + dy < canyonFloor) {
                    grid.setElement(slopeX, slopeY + dy, sand);
                }
            }
        }

    }

    generateVolcanicHell(scene) {
        const grid = scene.pixelGrid;
        const stone = scene.elementRegistry.get('stone');
        const wall = scene.elementRegistry.get('wall');
        const lava = scene.elementRegistry.get('lava');
        const fire = scene.elementRegistry.get('fire');

        const baseLevel = Math.floor(grid.height * 0.70);

        // 1. BUILD BASE PLATFORMS
        for (let x = 3; x < Math.floor(grid.width * 0.3); x++) {
            const platformTop = baseLevel - 15;
            for (let y = platformTop; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
        }

        for (let x = Math.floor(grid.width * 0.35); x < Math.floor(grid.width * 0.65); x++) {
            const platformTop = baseLevel;
            for (let y = platformTop; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
        }

        for (let x = Math.floor(grid.width * 0.7); x < grid.width - 3; x++) {
            const platformTop = baseLevel - 20;
            for (let y = platformTop; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
        }

        // 2. CREATE LAVA CRATERS
        const craters = [
            { x: Math.floor(grid.width * 0.2), y: baseLevel - 15, width: 18, depth: 12 },
            { x: Math.floor(grid.width * 0.5), y: baseLevel, width: 25, depth: 15 },
            { x: Math.floor(grid.width * 0.8), y: baseLevel - 20, width: 20, depth: 14 }
        ];

        craters.forEach(crater => {
            const halfWidth = Math.floor(crater.width / 2);

            for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
                const wallX = Math.floor(crater.x + Math.cos(angle) * (halfWidth + 3));
                const wallY = crater.y;
                for (let h = 0; h < 5; h++) {
                    grid.setElement(wallX, wallY - h, wall);
                }
            }

            for (let x = crater.x - halfWidth; x <= crater.x + halfWidth; x++) {
                for (let dx = -2; dx <= 2; dx++) {
                    grid.setElement(x + dx, crater.y + crater.depth, stone);
                }
            }

            for (let x = crater.x - halfWidth; x <= crater.x + halfWidth; x++) {
                const distFromCenter = Math.abs(x - crater.x);
                const lavaTop = crater.y + Math.floor(distFromCenter * 0.3);
                for (let y = lavaTop; y < crater.y + crater.depth; y++) {
                    grid.setElement(x, y, lava);
                }
            }

            for (let i = 0; i < 4; i++) {
                const ventAngle = (i / 4) * Math.PI * 2;
                const ventX = Math.floor(crater.x + Math.cos(ventAngle) * (halfWidth + 5));
                const ventY = crater.y - 6;
                grid.setElement(ventX, ventY, fire);
            }
        });

    }

    generateFrozenTundra(scene) {
        const grid = scene.pixelGrid;
        const ice = scene.elementRegistry.get('ice');
        const water = scene.elementRegistry.get('water');
        const stone = scene.elementRegistry.get('stone');
        const wall = scene.elementRegistry.get('wall');

        const baseLevel = Math.floor(grid.height * 0.65);
        const surfaceLevel = Math.floor(grid.height * 0.50);

        // 1. BUILD STONE BEDROCK
        for (let x = 3; x < grid.width - 3; x++) {
            for (let y = baseLevel + 10; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
        }

        // 2. BUILD ICE PLATFORMS
        for (let x = 3; x < Math.floor(grid.width * 0.35); x++) {
            const iceTop = surfaceLevel - 8;
            const iceThickness = 15 + Math.floor(Math.random() * 5);
            for (let y = iceTop; y < iceTop + iceThickness; y++) {
                grid.setElement(x, y, ice);
            }
        }

        for (let x = Math.floor(grid.width * 0.4); x < Math.floor(grid.width * 0.6); x++) {
            const iceTop = surfaceLevel + 5;
            const iceThickness = 12 + Math.floor(Math.random() * 4);
            for (let y = iceTop; y < iceTop + iceThickness; y++) {
                grid.setElement(x, y, ice);
            }
        }

        for (let x = Math.floor(grid.width * 0.65); x < grid.width - 3; x++) {
            const iceTop = surfaceLevel - 5;
            const iceThickness = 18 + Math.floor(Math.random() * 6);
            for (let y = iceTop; y < iceTop + iceThickness; y++) {
                grid.setElement(x, y, ice);
            }
        }

        // 3. CREATE FROZEN LAKES
        const lakes = [
            { x: Math.floor(grid.width * 0.25), width: 25, depth: 12 },
            { x: Math.floor(grid.width * 0.75), width: 20, depth: 10 }
        ];

        lakes.forEach(lake => {
            const halfWidth = Math.floor(lake.width / 2);
            const lakeBottom = baseLevel + 10;

            for (let y = lakeBottom - lake.depth - 5; y <= lakeBottom; y++) {
                grid.setElement(lake.x - halfWidth - 2, y, wall);
                grid.setElement(lake.x + halfWidth + 2, y, wall);
            }

            for (let x = lake.x - halfWidth; x <= lake.x + halfWidth; x++) {
                grid.setElement(x, lakeBottom, stone);
            }

            for (let x = lake.x - halfWidth; x <= lake.x + halfWidth; x++) {
                for (let y = lakeBottom - lake.depth; y < lakeBottom - 3; y++) {
                    grid.setElement(x, y, water);
                }
            }

            for (let x = lake.x - halfWidth; x <= lake.x + halfWidth; x++) {
                for (let y = lakeBottom - lake.depth - 3; y < lakeBottom - lake.depth; y++) {
                    grid.setElement(x, y, ice);
                }
            }
        });

    }

    generateForestValley(scene) {
        const grid = scene.pixelGrid;
        const stone = scene.elementRegistry.get('stone');
        const wall = scene.elementRegistry.get('wall');
        const sand = scene.elementRegistry.get('sand');
        const treeSeed = scene.elementRegistry.get('tree_seed');
        const plant = scene.elementRegistry.get('plant');
        const water = scene.elementRegistry.get('water');
        const fish = scene.elementRegistry.get('fish');

        const valleyFloor = Math.floor(grid.height * 0.70);
        const hillTop = Math.floor(grid.height * 0.45);
        const valleyWidth = 60;
        const valleyCenterX = Math.floor(grid.width / 2);

        // 1. BUILD LEFT HILLSIDE
        const leftHillEnd = valleyCenterX - valleyWidth / 2;
        for (let x = 3; x < leftHillEnd; x++) {
            for (let y = hillTop + 20; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
            const soilDepth = 6 + Math.floor(Math.random() * 4);
            for (let y = hillTop; y < hillTop + soilDepth; y++) {
                grid.setElement(x, y, sand);
            }
        }

        // 2. BUILD RIGHT HILLSIDE
        const rightHillStart = valleyCenterX + valleyWidth / 2;
        for (let x = rightHillStart; x < grid.width - 3; x++) {
            for (let y = hillTop + 20; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
            const soilDepth = 6 + Math.floor(Math.random() * 4);
            for (let y = hillTop; y < hillTop + soilDepth; y++) {
                grid.setElement(x, y, sand);
            }
        }

        // 3. BUILD VALLEY FLOOR
        for (let x = leftHillEnd; x < rightHillStart; x++) {
            for (let y = valleyFloor + 10; y < grid.height - 3; y++) {
                grid.setElement(x, y, stone);
            }
            const soilDepth = 4 + Math.floor(Math.random() * 3);
            for (let y = valleyFloor; y < valleyFloor + soilDepth; y++) {
                grid.setElement(x, y, sand);
            }
        }

        // 4. CREATE WATER STREAM
        const streamWidth = 20;
        const streamDepth = 8;
        const streamBottom = valleyFloor + 10;

        for (let y = streamBottom - streamDepth - 2; y <= streamBottom; y++) {
            grid.setElement(valleyCenterX - streamWidth / 2 - 3, y, wall);
            grid.setElement(valleyCenterX + streamWidth / 2 + 3, y, wall);
        }

        for (let x = valleyCenterX - streamWidth / 2; x <= valleyCenterX + streamWidth / 2; x++) {
            grid.setElement(x, streamBottom, stone);
        }

        for (let x = valleyCenterX - streamWidth / 2; x <= valleyCenterX + streamWidth / 2; x++) {
            for (let y = streamBottom - streamDepth; y < streamBottom; y++) {
                grid.setElement(x, y, water);
            }
        }

        // 5. PLANT TREES
        for (let i = 0; i < 12; i++) {
            const treeX = 10 + Math.floor(Math.random() * (leftHillEnd - 15));
            const treeY = hillTop - 2;
            grid.setElement(treeX, treeY, treeSeed);
        }

        for (let i = 0; i < 12; i++) {
            const treeX = rightHillStart + 5 + Math.floor(Math.random() * (grid.width - rightHillStart - 15));
            const treeY = hillTop - 2;
            grid.setElement(treeX, treeY, treeSeed);
        }

        // 6. ADD PLANTS
        for (let i = 0; i < 40; i++) {
            const plantX = leftHillEnd + Math.floor(Math.random() * valleyWidth);
            const plantY = valleyFloor - 1;
            if (Math.abs(plantX - valleyCenterX) > streamWidth / 2 + 4) {
                grid.setElement(plantX, plantY, plant);
            }
        }

        // 7. ADD FISH
        for (let i = 0; i < 8; i++) {
            const fishX = valleyCenterX - streamWidth / 2 + Math.floor(Math.random() * streamWidth);
            const fishY = streamBottom - 2 - Math.floor(Math.random() * (streamDepth - 3));
            grid.setElement(fishX, fishY, fish);
        }

    }
}
