/**
 * LightingManager - Manages house lighting based on time of day
 * Turns lights on at evening, off gradually through the night
 */

export class LightingManager {
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

        // Occasionally spawn builders during daytime (0.3-0.6, avoid dawn/dusk)
        // Very rare: 0.01% chance per frame = ~1 builder every 10000 frames = ~2.7 minutes at 60fps
        if (time > 0.3 && time < 0.6 && Math.random() < 0.0001) {
            this.spawnBuilderFromHouse(grid);
        }

        // Determine if lights should be on based on time
        // Evening starts at 0.7 (dusk), lights start turning on
        // Night is 0.8-0.2 (fully dark)
        // Morning starts at 0.2 (dawn), lights start turning off

        const isEvening = time > 0.7 && time < 0.85; // 0.7-0.85: lights turning on
        const isNight = time >= 0.85 || time < 0.2;  // 0.85-0.2: night (most lights on)
        const isMorning = time >= 0.2 && time < 0.3; // 0.2-0.3: lights turning off
        const isDay = time >= 0.3 && time <= 0.7;    // 0.3-0.7: day (no lights)

        for (const house of grid.houses) {
            if (isDay) {
                // Day time - turn off all lights
                this.turnOffLights(house, grid);
            } else if (isEvening) {
                // Evening - turn on lights
                this.turnOnLights(house, grid, false);
            } else if (isNight) {
                // Deep night - gradually turn off some lights
                // Calculate how deep into night we are (0.85-1.0 or 0.0-0.2)
                let nightProgress;
                if (time >= 0.85) {
                    nightProgress = (time - 0.85) / 0.15; // 0.85->1.0 maps to 0->1
                } else {
                    nightProgress = 1 + time / 0.2; // 0->0.2 maps to 1->2
                }

                // Very rarely (every 600 frames = 10 seconds), randomly turn off lights
                if (grid.frameCount % 600 === 0 && nightProgress > 0.3) {
                    const shouldTurnOff = Math.random() < nightProgress * 0.5; // Higher chance as night progresses
                    if (shouldTurnOff) {
                        this.turnOffRandomLight(house, grid);
                    }
                }
            } else if (isMorning) {
                // Morning - turn off remaining lights
                this.turnOffLights(house, grid);
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
            // 20% chance to keep all lights, 30% to keep 1 light, 50% to turn off one
            const keepAllChance = 0.2;
            const keepOneChance = 0.3;

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
}

export default LightingManager;
