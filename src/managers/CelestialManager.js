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
     * Render the sun with corona layers
     * @param {Phaser.GameObjects.Graphics} graphics - The graphics object to draw on
     * @param {Object} sunPos - Sun position {x, y}
     * @param {number} cloudCoverage - Cloud coverage (0-1)
     * @param {Object} sunTint - RGB tint object {r, g, b}
     */
    renderSun(graphics, sunPos, cloudCoverage, sunTint) {
        const sunDimming = 1 - (cloudCoverage * 0.5); // Max 50% dimmer with full cloud cover

        const sunCore = this.tintColor(0xffff00, sunTint);
        const sunCorona1 = this.tintColor(0xffa500, sunTint);
        const sunCorona2 = this.tintColor(0xff8c00, sunTint);
        const sunCorona3 = this.tintColor(0xff6b35, sunTint);

        // Sun core (bright yellow)
        graphics.fillStyle(sunCore, 1.0 * sunDimming);
        graphics.fillCircle(sunPos.x, sunPos.y, this.sunRadius);

        // Sun corona (orange glow - multiple layers) - also dimmed
        graphics.fillStyle(sunCorona1, 0.4 * sunDimming);
        graphics.fillCircle(sunPos.x, sunPos.y, this.sunRadius * 1.4);
        graphics.fillStyle(sunCorona2, 0.2 * sunDimming);
        graphics.fillCircle(sunPos.x, sunPos.y, this.sunRadius * 1.8);
        graphics.fillStyle(sunCorona3, 0.1 * sunDimming);
        graphics.fillCircle(sunPos.x, sunPos.y, this.sunRadius * 2.2);
    }

    /**
     * Apply RGB tint to a color
     * @param {number} color - Hex color
     * @param {Object} tint - RGB tint object {r, g, b}
     * @returns {number} Tinted hex color
     */
    tintColor(color, tint) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        const tintedR = Math.min(255, Math.floor(r * tint.r));
        const tintedG = Math.min(255, Math.floor(g * tint.g));
        const tintedB = Math.min(255, Math.floor(b * tint.b));

        return (tintedR << 16) | (tintedG << 8) | tintedB;
    }

    /**
     * Render the moon with proper phase geometry
     * @param {Phaser.GameObjects.Graphics} graphics - The graphics object to draw on
     * @param {Object} moonPos - Moon position {x, y}
     */
    renderMoon(graphics, moonPos) {
        const moonPhase = this.getMoonPhaseNormalized();
        const radius = this.moonRadius;

        // Calculate brightness for this phase
        // Phase 0 = new moon, 0.5 = full moon, 1.0 = new moon
        const phaseAngle = moonPhase * Math.PI * 2;
        const illumination = -Math.cos(phaseAngle); // -1 (new) to +1 (full)
        const brightness = (illumination + 1) / 2; // 0 to 1

        // Subtle moon glow - only when illuminated enough
        if (brightness > 0.3) {
            const glowAlpha = brightness * 0.04;
            graphics.fillStyle(0xa0a0b0, glowAlpha);
            graphics.fillCircle(moonPos.x, moonPos.y, radius * 1.4);
        }

        // Draw moon phases using proper lunar geometry
        if (brightness < 0.05) {
            // New moon - barely visible, very dim
            graphics.fillStyle(0x4a4a4a, 0.4);
            graphics.fillCircle(moonPos.x, moonPos.y, radius);
        } else if (brightness >= 0.98) {
            // Full moon - bright and luminous
            graphics.fillStyle(0xf5f5f5, 1.0);
            graphics.fillCircle(moonPos.x, moonPos.y, radius);
        } else {
            // Draw moon phase using the classic method:
            // Outer edge is always a semicircle, terminator is an ellipse

            // Phase cycle: 0→new, 0.25→first quarter, 0.5→full, 0.75→third quarter, 1→new
            // moonPhase 0-0.5: waxing (new→full, right side lit)
            // moonPhase 0.5-1: waning (full→new, left side lit)
            const isWaxing = moonPhase < 0.5;
            const k = illumination; // +1 (full) to -1 (new)

            graphics.fillStyle(0xe8e8e8, 1.0);
            graphics.beginPath();

            if (isWaxing) {
                // Waxing moon - lit portion on the RIGHT side
                // Start at top, draw right semicircle (lit edge)
                graphics.arc(moonPos.x, moonPos.y, radius, -Math.PI / 2, Math.PI / 2, false);

                // Draw terminator curve from bottom to top (left side)
                const segments = 30;
                for (let i = 0; i <= segments; i++) {
                    const theta = Math.PI / 2 - (i / segments) * Math.PI; // π/2 to -π/2 (bottom to top)
                    const y = moonPos.y + radius * Math.sin(theta);
                    const x = moonPos.x - radius * k * Math.cos(theta); // Negated k: crescent when k<0, gibbous when k>0
                    graphics.lineTo(x, y);
                }
            } else {
                // Waning moon - lit portion on the LEFT side
                // Start at top, draw left semicircle (lit edge)
                graphics.arc(moonPos.x, moonPos.y, radius, -Math.PI / 2, Math.PI / 2, true);

                // Draw terminator curve from bottom to top (right side)
                const segments = 30;
                for (let i = 0; i <= segments; i++) {
                    const theta = Math.PI / 2 - (i / segments) * Math.PI; // π/2 to -π/2 (bottom to top - SAME as waxing)
                    const y = moonPos.y + radius * Math.sin(theta);
                    const x = moonPos.x + radius * k * Math.cos(theta); // Negated k: gibbous when k>0, crescent when k<0
                    graphics.lineTo(x, y);
                }
            }

            graphics.closePath();
            graphics.fillPath();
        }
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
