/**
 * CelestialManager.js - Manages sun and moon positioning and moon phases
 *
 * Moon Phases (8 phases):
 * 0 = New Moon
 * 1 = Waxing Crescent
 * 2 = First Quarter
 * 3 = Waxing Gibbous
 * 4 = Full Moon
 * 5 = Waning Gibbous
 * 6 = Third Quarter (Last Quarter)
 * 7 = Waning Crescent
 */

export default class CelestialManager {
    constructor() {
        // Sun configuration
        this.sunRadius = 25;

        // Moon configuration
        this.moonRadius = 18;

        // Moon phases (8 discrete states)
        this.moonPhases = [
            'new',              // 0
            'waxing_crescent',  // 1
            'first_quarter',    // 2
            'waxing_gibbous',   // 3
            'full',             // 4
            'waning_gibbous',   // 5
            'third_quarter',    // 6
            'waning_crescent'   // 7
        ];

        // Start with random moon phase
        this.currentMoonPhaseIndex = Math.floor(Math.random() * 8);

        // Track when we last changed the moon phase
        this.lastPhaseChangeDay = -1; // -1 means never changed yet
    }

    /**
     * Update moon phase - called once per frame
     * Changes moon phase once per day at dawn
     */
    update(timeOfDay, currentDay) {
        // Change moon phase at dawn (time crosses 0.25) on a new day
        // This makes the change less noticeable than at midnight
        const isDawn = timeOfDay >= 0.25 && timeOfDay < 0.3;

        // If we're in dawn and haven't changed phase for this day yet
        if (isDawn && currentDay !== this.lastPhaseChangeDay) {
            // Advance to next phase
            this.currentMoonPhaseIndex = (this.currentMoonPhaseIndex + 1) % 8;
            this.lastPhaseChangeDay = currentDay;

            console.log(`🌙 Moon phase changed to: ${this.moonPhases[this.currentMoonPhaseIndex]}`);
        }
    }

    /**
     * Get current moon phase index (0-7)
     */
    getMoonPhaseIndex() {
        return this.currentMoonPhaseIndex;
    }

    /**
     * Get current moon phase name
     */
    getMoonPhaseName() {
        return this.moonPhases[this.currentMoonPhaseIndex];
    }

    /**
     * Get moon phase as normalized value (0 to 1)
     * Used for rendering calculations
     */
    getMoonPhaseNormalized() {
        // Convert 8-phase index to 0-1 range
        // 0 = new (0.0)
        // 2 = first quarter (0.25)
        // 4 = full (0.5)
        // 6 = third quarter (0.75)
        return this.currentMoonPhaseIndex / 8;
    }

    /**
     * Calculate sun position based on time of day
     * Returns { x, y } coordinates
     */
    getSunPosition(width, height, time) {
        // Sun position: rises at 0.25 (dawn), peaks at 0.5 (noon), sets at 0.75 (dusk)
        const sunPhase = (time - 0.25) / 0.5; // 0 to 1 for sunrise to sunset
        const sunAngle = sunPhase * Math.PI; // 0 to π (half circle from left to right)

        const baseX = Math.cos(Math.PI - sunAngle);
        const baseY = Math.sin(sunAngle);

        const horizontalScale = 0.5;
        const minHeight = 0.20;
        const maxHeight = 0.95;
        const verticalRange = maxHeight - minHeight;

        const sunX = width / 2 + baseX * width * horizontalScale;
        const sunY = height - (minHeight + baseY * verticalRange) * height;

        return { x: sunX, y: sunY };
    }

    /**
     * Calculate moon position based on time of day
     * Returns { x, y } coordinates
     */
    getMoonPosition(width, height, time) {
        // Moon position (opposite of sun - 12 hours offset = +0.5 time)
        const moonTime = (time + 0.5) % 1.0;
        const moonPhase = (moonTime - 0.25) / 0.5;
        const moonAngle = moonPhase * Math.PI;

        const moonBaseX = Math.cos(Math.PI - moonAngle);
        const moonBaseY = Math.sin(moonAngle);

        const horizontalScale = 0.5;
        const minHeight = 0.20;
        const maxHeight = 0.95;
        const verticalRange = maxHeight - minHeight;

        const moonX = width / 2 + moonBaseX * width * horizontalScale;
        const moonY = height - (minHeight + moonBaseY * verticalRange) * height;

        return { x: moonX, y: moonY };
    }

    /**
     * Check if sun is visible at current time
     */
    isSunVisible(time) {
        return time > 0.2 && time < 0.8;
    }

    /**
     * Check if moon is visible at current time
     */
    isMoonVisible(time) {
        return time < 0.3 || time > 0.7;
    }

    /**
     * Serialize state for save/load
     */
    serialize() {
        return {
            currentMoonPhaseIndex: this.currentMoonPhaseIndex,
            lastPhaseChangeDay: this.lastPhaseChangeDay
        };
    }

    /**
     * Deserialize state from save data
     */
    deserialize(data) {
        if (data.currentMoonPhaseIndex !== undefined) {
            this.currentMoonPhaseIndex = data.currentMoonPhaseIndex;
        }
        if (data.lastPhaseChangeDay !== undefined) {
            this.lastPhaseChangeDay = data.lastPhaseChangeDay;
        }
    }
}
