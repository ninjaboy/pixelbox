/**
 * LightingManager - Manages house lighting based on time of day
 * Turns lights on at evening, off gradually through the night
 */

export class LightingManager {
    // PERFORMANCE: Track previous time state to avoid redundant updates
    static previousTimeState = null;
    static builderSpawnFrameCounter = 0;
    /**
     * Update all house lights based on time of day
     * Called once per frame from PixelGrid.update()
     * @param {PixelGrid} grid - The pixel grid
     * @param {number} time - Current time of day (0-1, where 0.5 is noon)
     */
    static updateHouseLights(grid, time) {
        if (!grid.houses || grid.houses.length === 0) {
            return;
        }

        // PERFORMANCE: Builder spawning every 60 frames instead of every frame
        this.builderSpawnFrameCounter++;
        if (this.builderSpawnFrameCounter >= 60) {
            this.builderSpawnFrameCounter = 0;
            // Occasionally spawn builders during daytime (0.3-0.6, avoid dawn/dusk)
            // Check probability: 0.005% chance per frame = 0.3% chance per 60 frames (half as frequent)
            if (time > 0.3 && time < 0.6 && Math.random() < 0.003) {
                this.spawnBuilderFromHouse(grid);
            }
        }

        // PERFORMANCE: Check house integrity every 60 frames (once per second)
        if (!this.integrityCheckCounter) this.integrityCheckCounter = 0;
        this.integrityCheckCounter++;
        if (this.integrityCheckCounter >= 60) {
            this.integrityCheckCounter = 0;
            this.checkAndRemoveDestroyedHouses(grid);
        }

        // Determine time state
        let currentTimeState;
        if (time >= 0.3 && time <= 0.7) {
            currentTimeState = 'day';
        } else if (time > 0.7 && time < 0.85) {
            currentTimeState = 'evening';
        } else if (time >= 0.85 || time < 0.2) {
            currentTimeState = 'night';
        } else {
            currentTimeState = 'morning'; // 0.2-0.3
        }

        // PERFORMANCE: Only update lights on state transitions
        const stateChanged = this.previousTimeState !== currentTimeState;

        if (stateChanged) {
            // State transition - update all houses
            for (const house of grid.houses) {
                if (currentTimeState === 'day') {
                    this.turnOffLights(house, grid);
                } else if (currentTimeState === 'evening') {
                    this.turnOnLights(house, grid, false);
                } else if (currentTimeState === 'morning') {
                    // Late nighters keep their lights on in the morning!
                    if (!house.isLateNighter) {
                        this.turnOffLights(house, grid);
                    }
                }
            }
            this.previousTimeState = currentTimeState;
        }

        // Night light switching happens every frame (only when in night state)
        if (currentTimeState === 'night') {
            for (const house of grid.houses) {
                // Deep night - randomly turn off individual lights throughout the night
                // Late nighters turn off lights much more slowly
                // Normal houses: 0.6% chance per frame
                // Late nighters: 0.1% chance per frame (6x slower)
                const turnOffChance = house.isLateNighter ? 0.001 : 0.006;

                if (Math.random() < turnOffChance) {
                    this.turnOffRandomLight(house, grid);
                }
            }
        }
    }

    static turnOnLights(house, grid, allLights = false) {
        const lightElement = grid.registry.get('light');
        if (!lightElement) return;

        // Initialize light colors for this house if not already done
        if (!house.lightColors) {
            house.lightColors = house.windows.map(() => this.randomLightColor());
        }

        // Turn on lights in window positions with varied colors
        for (let i = 0; i < house.windows.length; i++) {
            const window = house.windows[i];
            const element = grid.getElement(window.x, window.y);
            if (element && element.id === 0) { // Only place if empty
                grid.setElement(window.x, window.y, lightElement);
                // Store the light color in cell data
                const cell = grid.getCell(window.x, window.y);
                if (cell) {
                    cell.data.lightColor = house.lightColors[i];
                }
            }
        }
        house.lightsOn = true;
    }

    // Generate random light colors with variations
    static randomLightColor() {
        const variants = [
            0xffffff,    // Pure white (bright)
            0xfff8f0,    // Warm white
            0xfff4e0,    // Soft warm white
            0xffe8d0,    // Cream
            0xffd0c0,    // Peachy warm
            0xffd8e8,    // Subtle pink
            0xffe0ff,    // Light pink/purple
            0xf0f0f0,    // Soft white (dimmer)
        ];
        return variants[Math.floor(Math.random() * variants.length)];
    }

    static turnOffLights(house, grid) {
        // Turn off all lights
        for (const window of house.windows) {
            const element = grid.getElement(window.x, window.y);
            if (element && element.name === 'light') {
                grid.setElement(window.x, window.y, grid.registry.get('empty'));
            }
        }
        house.lightsOn = false;
    }

    static turnOffRandomLight(house, grid) {
        // Turn off one random light, but keep at least one on sometimes
        const litWindows = house.windows.filter(w => {
            const element = grid.getElement(w.x, w.y);
            return element && element.name === 'light';
        });

        if (litWindows.length > 0) {
            // Late nighters keep more lights on!
            // Normal: 20% keep all, 30% keep 1
            // Late nighter: 60% keep all, 80% keep 1
            const keepAllChance = house.isLateNighter ? 0.6 : 0.2;
            const keepOneChance = house.isLateNighter ? 0.8 : 0.3;

            if (Math.random() < keepAllChance) {
                return; // Keep all lights on
            }

            if (litWindows.length === 1 && Math.random() < keepOneChance) {
                return; // Keep the last light
            }

            // Turn off a random light
            const randomWindow = litWindows[Math.floor(Math.random() * litWindows.length)];
            grid.setElement(randomWindow.x, randomWindow.y, grid.registry.get('empty'));
        }
    }

    // Spawn a builder from a random house
    static spawnBuilderFromHouse(grid) {
        if (!grid.houses || grid.houses.length === 0) return;

        // Pick a random house
        const house = grid.houses[Math.floor(Math.random() * grid.houses.length)];

        // Don't spawn multiple builders from same house
        if (house.hasBuilder) return;

        // Try to spawn builder on top of the house roof
        const spawnX = house.centerX;
        const spawnY = house.baseY - 10; // Approximately on roof

        // Find the actual roof surface
        for (let searchY = spawnY; searchY < house.baseY; searchY++) {
            const element = grid.getElement(spawnX, searchY);
            const below = grid.getElement(spawnX, searchY + 1);

            // Found roof (empty above, solid below)
            if (element && element.id === 0 && below && below.name === 'stone') {
                const builderElement = grid.registry.get('house_seed');
                if (builderElement) {
                    grid.setElement(spawnX, searchY, builderElement);
                    house.hasBuilder = true;

                    // Reset after some time to allow another builder eventually
                    setTimeout(() => {
                        house.hasBuilder = false;
                    }, 180000); // 3 minutes
                }
                return;
            }
        }
    }

    /**
     * Check if houses are destroyed (burned/demolished) and remove them from tracking
     * A house is considered destroyed if key structural elements are missing
     */
    static checkAndRemoveDestroyedHouses(grid) {
        if (!grid.houses || grid.houses.length === 0) return;

        // Filter out destroyed houses
        grid.houses = grid.houses.filter(house => {
            // Check key structural positions: walls, foundation, windows
            const checkPositions = [
                { x: house.centerX - 2, y: house.baseY - 1 }, // Left wall, floor 1
                { x: house.centerX - 2, y: house.baseY - 2 }, // Left wall, floor 1 upper
                { x: house.centerX + 2, y: house.baseY - 1 }, // Right wall, floor 1
                { x: house.centerX + 2, y: house.baseY - 2 }, // Right wall, floor 1 upper
                { x: house.centerX, y: house.baseY }           // Foundation center
            ];

            // Count remaining structural elements
            let structureCount = 0;
            const validMaterials = ['wood', 'glass', 'stone'];

            for (const pos of checkPositions) {
                const element = grid.getElement(pos.x, pos.y);
                if (element && validMaterials.includes(element.name)) {
                    structureCount++;
                }
            }

            // If less than 2 structural elements remain, house is destroyed
            if (structureCount < 2) {
                // Remove any remaining lights before removing house from tracking
                this.turnOffLights(house, grid);
                return false; // Remove from tracking
            }

            return true; // Keep house in tracking
        });
    }
}

export default LightingManager;
