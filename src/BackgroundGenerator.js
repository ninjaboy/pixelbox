/**
 * BackgroundGenerator.js - Procedural background generation for Pixellence
 *
 * Generates layered parallax backgrounds with different biome types.
 * Uses procedural generation (Perlin-like noise, layered silhouettes) for variety.
 *
 * Biome types: mountains, forest, desert, ocean, sky (default)
 *
 * Usage:
 *   const bg = new BackgroundGenerator(scene, biome);
 *   bg.render(width, height, time, seasonData);
 */

// Simple noise function for procedural generation (simplified Perlin-like)
class NoiseGenerator {
    constructor(seed = Math.random() * 10000) {
        this.seed = seed;
        this.permutation = this.generatePermutation();
    }

    generatePermutation() {
        const perm = [];
        for (let i = 0; i < 256; i++) perm[i] = i;
        // Shuffle based on seed
        let s = this.seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            const j = s % (i + 1);
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return [...perm, ...perm]; // Double for wrapping
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    grad(hash, x) {
        return (hash & 1) === 0 ? x : -x;
    }

    noise1D(x) {
        const X = Math.floor(x) & 255;
        x -= Math.floor(x);
        const u = this.fade(x);
        return this.lerp(
            this.grad(this.permutation[X], x),
            this.grad(this.permutation[X + 1], x - 1),
            u
        );
    }

    // Fractional Brownian Motion for more natural terrain
    fbm(x, octaves = 4, lacunarity = 2, persistence = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise1D(x * frequency);
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return value / maxValue;
    }
}

// Biome configuration
const BIOME_CONFIG = {
    mountains: {
        layers: [
            { color: 0x1a1a2e, heightRange: [0.4, 0.7], noiseScale: 0.008, parallaxSpeed: 0.1, opacity: 1.0 },
            { color: 0x2d2d44, heightRange: [0.35, 0.6], noiseScale: 0.012, parallaxSpeed: 0.2, opacity: 0.95 },
            { color: 0x3d3d5c, heightRange: [0.3, 0.55], noiseScale: 0.015, parallaxSpeed: 0.35, opacity: 0.9 },
            { color: 0x4a4a6a, heightRange: [0.25, 0.5], noiseScale: 0.02, parallaxSpeed: 0.5, opacity: 0.85 },
        ],
        snowCap: true,
        snowThreshold: 0.55, // Height above which snow appears
        hazeColor: 0x6b7b8c,
        hazeAmount: 0.15,
    },
    forest: {
        layers: [
            { color: 0x0d1f0d, heightRange: [0.15, 0.35], noiseScale: 0.03, parallaxSpeed: 0.1, opacity: 1.0, trees: true },
            { color: 0x1a3a1a, heightRange: [0.12, 0.3], noiseScale: 0.04, parallaxSpeed: 0.25, opacity: 0.9, trees: true },
            { color: 0x2a4a2a, heightRange: [0.1, 0.25], noiseScale: 0.05, parallaxSpeed: 0.4, opacity: 0.85, trees: true },
            { color: 0x3a5a3a, heightRange: [0.08, 0.22], noiseScale: 0.06, parallaxSpeed: 0.6, opacity: 0.8, trees: true },
        ],
        hazeColor: 0x5a6a5a,
        hazeAmount: 0.1,
    },
    desert: {
        layers: [
            { color: 0x4a3a2a, heightRange: [0.15, 0.35], noiseScale: 0.006, parallaxSpeed: 0.08, opacity: 1.0, dunes: true },
            { color: 0x6a5a4a, heightRange: [0.1, 0.28], noiseScale: 0.01, parallaxSpeed: 0.2, opacity: 0.9, dunes: true },
            { color: 0x8a7a6a, heightRange: [0.08, 0.22], noiseScale: 0.015, parallaxSpeed: 0.35, opacity: 0.85, dunes: true },
        ],
        hazeColor: 0xd4a574,
        hazeAmount: 0.2,
    },
    ocean: {
        layers: [
            { color: 0x0a2a4a, heightRange: [0.05, 0.15], noiseScale: 0.02, parallaxSpeed: 0.05, opacity: 1.0, waves: true },
            { color: 0x1a4a6a, heightRange: [0.03, 0.12], noiseScale: 0.03, parallaxSpeed: 0.15, opacity: 0.85, waves: true },
            { color: 0x2a5a7a, heightRange: [0.02, 0.1], noiseScale: 0.04, parallaxSpeed: 0.3, opacity: 0.7, waves: true },
        ],
        hazeColor: 0x6a8a9a,
        hazeAmount: 0.15,
    },
    sky: {
        layers: [], // Sky-only mode - no terrain layers
        hazeColor: 0x87ceeb,
        hazeAmount: 0.0,
    }
};

// Seasonal color modifiers
const SEASONAL_MODIFIERS = {
    spring: {
        colorShift: { r: 1.0, g: 1.05, b: 1.0 },
        forestColor: 0x2a5a2a,
    },
    summer: {
        colorShift: { r: 1.05, g: 1.05, b: 1.0 },
        forestColor: 0x1a4a1a,
    },
    autumn: {
        colorShift: { r: 1.1, g: 0.95, b: 0.85 },
        forestColor: 0x6a4a2a,
    },
    winter: {
        colorShift: { r: 0.9, g: 0.95, b: 1.05 },
        forestColor: 0x3a4a4a,
        snowOverlay: true,
    },
};

export default class BackgroundGenerator {
    constructor(scene, biome = 'mountains') {
        this.scene = scene;
        this.biome = biome;
        this.config = BIOME_CONFIG[biome] || BIOME_CONFIG.mountains;

        // Create graphics layer for background (render above sky, below celestial bodies)
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(-50); // Above sky (-100) but below celestial/particles

        // Create noise generators with different seeds for each layer
        this.noiseGenerators = this.config.layers.map((_, i) =>
            new NoiseGenerator(12345 + i * 1000)
        );

        // Animation offset for subtle movement
        this.timeOffset = 0;

        // Cache for terrain heights (avoid recalculating every frame)
        this.terrainCache = null;
        this.cacheWidth = 0;
        this.lastSeason = null;
    }

    /**
     * Set the biome type
     * @param {string} biome - One of: mountains, forest, desert, ocean, sky
     */
    setBiome(biome) {
        if (BIOME_CONFIG[biome]) {
            this.biome = biome;
            this.config = BIOME_CONFIG[biome];
            this.noiseGenerators = this.config.layers.map((_, i) =>
                new NoiseGenerator(12345 + i * 1000)
            );
            this.terrainCache = null; // Invalidate cache
        }
    }

    /**
     * Get available biomes
     */
    static getBiomes() {
        return Object.keys(BIOME_CONFIG);
    }

    /**
     * Render the background
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} time - Time of day (0-1)
     * @param {object} seasonData - Season information { season: 'spring'|'summer'|'autumn'|'winter' }
     */
    render(width, height, time, seasonData = {}) {
        this.graphics.clear();

        // Skip if sky-only mode
        if (this.biome === 'sky' || this.config.layers.length === 0) {
            return;
        }

        // Update time offset for subtle animation
        this.timeOffset += 0.0001;

        const season = seasonData.season || 'summer';
        const seasonMod = SEASONAL_MODIFIERS[season] || SEASONAL_MODIFIERS.summer;

        // Regenerate cache if needed
        if (!this.terrainCache || this.cacheWidth !== width || this.lastSeason !== season) {
            this.generateTerrainCache(width, height, season);
            this.cacheWidth = width;
            this.lastSeason = season;
        }

        // Render each layer from back to front
        for (let i = 0; i < this.config.layers.length; i++) {
            this.renderLayer(i, width, height, time, seasonMod);
        }

        // Add atmospheric haze
        if (this.config.hazeAmount > 0) {
            this.renderHaze(width, height, time);
        }
    }

    /**
     * Generate cached terrain heights for all layers
     */
    generateTerrainCache(width, height, season) {
        this.terrainCache = [];

        for (let layerIndex = 0; layerIndex < this.config.layers.length; layerIndex++) {
            const layer = this.config.layers[layerIndex];
            const noise = this.noiseGenerators[layerIndex];
            const heights = [];

            // Sample terrain at each x position (every 2 pixels for performance)
            for (let x = 0; x <= width; x += 2) {
                const noiseVal = noise.fbm(x * layer.noiseScale, 4);
                const normalizedNoise = (noiseVal + 1) / 2; // Convert -1..1 to 0..1

                // Map to height range
                const heightRange = layer.heightRange[1] - layer.heightRange[0];
                const baseHeight = layer.heightRange[0] + normalizedNoise * heightRange;

                heights.push(baseHeight);
            }

            this.terrainCache.push(heights);
        }
    }

    /**
     * Render a single terrain layer
     */
    renderLayer(layerIndex, width, height, time, seasonMod) {
        const layer = this.config.layers[layerIndex];
        const heights = this.terrainCache[layerIndex];

        if (!heights) return;

        // Calculate parallax offset based on time (subtle movement)
        const parallaxOffset = Math.sin(this.timeOffset * layer.parallaxSpeed * 10) * 5;

        // Apply seasonal and time-of-day color modifications
        let layerColor = this.applySeasonalColor(layer.color, seasonMod, time);

        // Apply time-of-day darkening
        layerColor = this.applyTimeDarkening(layerColor, time, layerIndex);

        // Begin path for terrain silhouette
        this.graphics.fillStyle(layerColor, layer.opacity);
        this.graphics.beginPath();

        // Start at bottom-left
        this.graphics.moveTo(0, height);

        // Draw terrain line
        for (let x = 0; x <= width; x += 2) {
            const cacheIndex = Math.floor(x / 2);
            const heightRatio = heights[cacheIndex] || 0;
            const y = height - (heightRatio * height);

            // Add slight wave effect for ocean biome
            let finalY = y;
            if (layer.waves) {
                finalY += Math.sin((x + this.timeOffset * 1000) * 0.02) * 3;
            }

            this.graphics.lineTo(x + parallaxOffset, finalY);
        }

        // Close path at bottom-right
        this.graphics.lineTo(width, height);
        this.graphics.closePath();
        this.graphics.fillPath();

        // Add snow caps for mountain biome in winter
        if (this.config.snowCap && (seasonMod.snowOverlay || this.biome === 'mountains')) {
            this.renderSnowCaps(layerIndex, width, height, heights, parallaxOffset);
        }

        // Add tree silhouettes for forest biome
        if (layer.trees) {
            this.renderTreeSilhouettes(layerIndex, width, height, heights, parallaxOffset, time);
        }
    }

    /**
     * Render snow caps on mountain peaks
     */
    renderSnowCaps(layerIndex, width, height, heights, parallaxOffset) {
        const snowThreshold = this.config.snowThreshold || 0.55;
        const snowColor = 0xddeeff;

        this.graphics.fillStyle(snowColor, 0.8);
        this.graphics.beginPath();

        let inSnow = false;
        let snowStartX = 0;

        for (let x = 0; x <= width; x += 2) {
            const cacheIndex = Math.floor(x / 2);
            const heightRatio = heights[cacheIndex] || 0;

            if (heightRatio > snowThreshold) {
                if (!inSnow) {
                    inSnow = true;
                    snowStartX = x;
                    const y = height - (heightRatio * height);
                    this.graphics.moveTo(x + parallaxOffset, y);
                }
                // Draw snow line slightly below peak
                const y = height - (heightRatio * height);
                const snowDepth = (heightRatio - snowThreshold) * height * 0.3;
                this.graphics.lineTo(x + parallaxOffset, y + snowDepth);
            } else if (inSnow) {
                // Close snow cap
                const y = height - (heightRatio * height);
                this.graphics.lineTo(x + parallaxOffset, y);

                // Go back to complete the cap
                for (let bx = x; bx >= snowStartX; bx -= 2) {
                    const bi = Math.floor(bx / 2);
                    const bh = heights[bi] || 0;
                    const by = height - (bh * height);
                    this.graphics.lineTo(bx + parallaxOffset, by);
                }

                this.graphics.closePath();
                this.graphics.fillPath();
                this.graphics.beginPath();
                inSnow = false;
            }
        }

        if (inSnow) {
            this.graphics.closePath();
            this.graphics.fillPath();
        }
    }

    /**
     * Render tree silhouettes on forest layers
     */
    renderTreeSilhouettes(layerIndex, width, height, heights, parallaxOffset, time) {
        const noise = this.noiseGenerators[layerIndex];
        const treeSpacing = 15 + layerIndex * 5; // More distant layers have sparser trees
        const treeHeight = 20 - layerIndex * 3;
        const treeWidth = 8 - layerIndex;

        // Time darkening
        const darkness = this.getTimeDarkness(time);
        const treeColor = this.darkenColor(0x0a150a, darkness);

        this.graphics.fillStyle(treeColor, 0.9 - layerIndex * 0.1);

        for (let x = 0; x < width; x += treeSpacing) {
            // Use noise to vary tree placement
            const treeNoise = noise.noise1D(x * 0.1);
            if (treeNoise < 0.2) continue; // Skip some trees

            const cacheIndex = Math.floor(x / 2);
            const heightRatio = heights[cacheIndex] || 0;
            const baseY = height - (heightRatio * height);

            // Draw simple triangle tree
            const tx = x + parallaxOffset + (treeNoise * 5);
            const h = treeHeight * (0.7 + treeNoise * 0.3);
            const w = treeWidth * (0.8 + treeNoise * 0.2);

            this.graphics.beginPath();
            this.graphics.moveTo(tx, baseY);
            this.graphics.lineTo(tx - w, baseY);
            this.graphics.lineTo(tx - w/2, baseY - h);
            this.graphics.lineTo(tx + w/2, baseY - h);
            this.graphics.lineTo(tx + w, baseY);
            this.graphics.closePath();
            this.graphics.fillPath();
        }
    }

    /**
     * Render atmospheric haze overlay
     */
    renderHaze(width, height, time) {
        const hazeColor = this.config.hazeColor;
        const hazeAmount = this.config.hazeAmount;

        // Apply time-based haze (more at dawn/dusk)
        let hazeMultiplier = 1;
        if (time < 0.3 || time > 0.7) {
            hazeMultiplier = 1.5;
        }

        // Gradient haze from bottom (stronger) to top (weaker)
        const hazeHeight = height * 0.6;
        this.graphics.fillGradientStyle(
            hazeColor, hazeColor,
            hazeColor, hazeColor,
            0, 0,
            hazeAmount * hazeMultiplier, hazeAmount * hazeMultiplier * 0.3
        );
        this.graphics.fillRect(0, height - hazeHeight, width, hazeHeight);
    }

    /**
     * Apply seasonal color modification
     */
    applySeasonalColor(color, seasonMod, time) {
        const r = ((color >> 16) & 0xFF) * seasonMod.colorShift.r;
        const g = ((color >> 8) & 0xFF) * seasonMod.colorShift.g;
        const b = (color & 0xFF) * seasonMod.colorShift.b;

        return (Math.min(255, Math.floor(r)) << 16) |
               (Math.min(255, Math.floor(g)) << 8) |
               Math.min(255, Math.floor(b));
    }

    /**
     * Apply time-of-day darkening
     */
    applyTimeDarkening(color, time, layerIndex) {
        const darkness = this.getTimeDarkness(time);
        // Farther layers (higher index) are less affected by darkness
        const adjustedDarkness = darkness * (1 - layerIndex * 0.15);
        return this.darkenColor(color, adjustedDarkness);
    }

    /**
     * Get darkness multiplier based on time of day
     */
    getTimeDarkness(time) {
        if (time < 0.2 || time > 0.85) {
            return 0.3; // Night
        } else if (time < 0.3) {
            return 0.3 + (time - 0.2) / 0.1 * 0.7; // Dawn
        } else if (time > 0.75) {
            return 1 - (time - 0.75) / 0.1 * 0.7; // Dusk
        }
        return 1; // Day
    }

    /**
     * Darken a color by a multiplier
     */
    darkenColor(color, multiplier) {
        const r = Math.floor(((color >> 16) & 0xFF) * multiplier);
        const g = Math.floor(((color >> 8) & 0xFF) * multiplier);
        const b = Math.floor((color & 0xFF) * multiplier);
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Destroy the background generator (cleanup)
     */
    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
        this.terrainCache = null;
        this.noiseGenerators = null;
    }
}
