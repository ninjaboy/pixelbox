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

        // Turn on lights in window positions
        for (const window of house.windows) {
            const element = grid.getElement(window.x, window.y);
            if (element && element.id === 0) { // Only place if empty
                grid.setElement(window.x, window.y, lightElement);
            }
        }
        house.lightsOn = true;
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
}

export default LightingManager;
