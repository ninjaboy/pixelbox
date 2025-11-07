import registry from './init.js';
import PixelGrid from './PixelGrid.js';

// Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.selectedElement = 'sand';
        this.isDrawing = false;
        this.elementRegistry = registry; // Use elementRegistry to avoid Phaser's built-in registry
        this.nextBoulderId = 1; // Unique ID counter for stone boulders
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Create pixel grid (4x4 pixel size for better performance on mobile)
        this.pixelSize = 4;
        this.pixelGrid = new PixelGrid(width, height, this.pixelSize, this.elementRegistry);

        // DAY/NIGHT CYCLE SYSTEM
        this.dayNightCycle = {
            time: 0, // 0 to 1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
            speed: 0.0001, // How fast time passes (full cycle = 10,000 frames = ~2.7 minutes at 60fps)
            sunRadius: 20,
            moonRadius: 15
        };

        // Create graphics layers
        this.skyGraphics = this.add.graphics();
        this.celestialGraphics = this.add.graphics();
        this.graphics = this.add.graphics();
        this.overlayGraphics = this.add.graphics();

        // Setup input
        this.input.on('pointerdown', this.startDrawing, this);
        this.input.on('pointerup', this.stopDrawing, this);
        this.input.on('pointermove', this.draw, this);

        // Element selector UI
        this.setupElementSelector();

        // Stats
        this.fpsText = document.getElementById('fps');
        this.particlesText = document.getElementById('particles');

        // Add some initial borders (stone walls)
        this.createBorders();
    }

    createBorders() {
        const wallElement = this.elementRegistry.get('wall');

        if (!wallElement) {
            console.error('Wall element not found in registry!');
            return;
        }

        // Bottom border
        for (let x = 0; x < this.pixelGrid.width; x++) {
            for (let i = 0; i < 3; i++) {
                this.pixelGrid.setElement(x, this.pixelGrid.height - 1 - i, wallElement);
            }
        }

        // Side borders
        for (let y = 0; y < this.pixelGrid.height; y++) {
            for (let i = 0; i < 3; i++) {
                this.pixelGrid.setElement(i, y, wallElement);
                this.pixelGrid.setElement(this.pixelGrid.width - 1 - i, y, wallElement);
            }
        }
    }

    setupElementSelector() {
        const selector = document.getElementById('element-selector');

        // Define elements with keybindings
        const elements = [
            { name: 'sand', key: '1' },
            { name: 'water', key: '2' },
            { name: 'stone', key: '3' },
            { name: 'wall', key: '4' },
            { name: 'wood', key: '5' },
            { name: 'fire', key: '6' },
            { name: 'oil', key: '7' },
            { name: 'gunpowder', key: '8' },
            { name: 'tree_seed', key: '9' },
            { name: 'fish', key: '0' },
            { name: 'eraser', key: 'E' }
        ];

        // Element visual configs
        const elementConfigs = {
            sand: { icon: '⋅', color: '#c2b280' },
            water: { icon: '≈', color: '#4a90e2' },
            stone: { icon: '●', color: '#666' },
            wall: { icon: '█', color: '#444' },
            fire: { icon: '🔥', color: '#ff6b35' },
            wood: { icon: '▓', color: '#8b4513' },
            oil: { icon: '○', color: '#3d3d1a' },
            gunpowder: { icon: '💣', color: '#333' },
            fossil: { icon: '🦴', color: '#8b7355' },
            fish: { icon: '🐟', color: '#1a5f7a' },
            tree_seed: { icon: '🌱', color: '#654321' },
            ash: { icon: '∴', color: '#666' },
            eraser: { icon: '✖', color: '#222' }
        };

        // Build UI
        elements.forEach(({ name: elementName, key }) => {
            const element = this.elementRegistry.get(elementName);
            if (!element && elementName !== 'eraser') return;

            const config = elementConfigs[elementName];
            const btn = document.createElement('button');
            btn.className = 'element-btn';
            if (elementName === 'sand') btn.classList.add('active');
            btn.dataset.element = elementName;
            btn.dataset.key = key;
            btn.style.background = config.color;
            btn.textContent = config.icon;

            // Add keybind indicator
            const keybind = document.createElement('div');
            keybind.className = 'keybind';
            keybind.textContent = key;
            btn.appendChild(keybind);

            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';

            const tooltipName = document.createElement('div');
            tooltipName.className = 'tooltip-name';
            tooltipName.textContent = elementName.replace(/_/g, ' ').toUpperCase();
            tooltip.appendChild(tooltipName);

            if (element) {
                const description = this.generateElementDescription(element);
                console.log(`[${elementName}] Description:`, description);

                const tooltipProps = document.createElement('div');
                tooltipProps.className = 'tooltip-props';
                tooltipProps.textContent = description;
                tooltip.appendChild(tooltipProps);
            }

            const tooltipKey = document.createElement('div');
            tooltipKey.className = 'tooltip-key';
            tooltipKey.textContent = `Press ${key}`;
            tooltip.appendChild(tooltipKey);

            btn.appendChild(tooltip);

            console.log(`Created tooltip for ${elementName}:`, tooltip);

            // Handle tooltip visibility with JavaScript
            btn.addEventListener('mouseenter', () => {
                const tooltipEl = btn.querySelector('.tooltip');
                tooltipEl.style.opacity = '1';
            });

            btn.addEventListener('mouseleave', () => {
                const tooltipEl = btn.querySelector('.tooltip');
                tooltipEl.style.opacity = '0';
            });

            btn.addEventListener('click', () => {
                document.querySelectorAll('.element-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedElement = elementName;
            });

            selector.appendChild(btn);
        });

        // Add keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();
            const btn = document.querySelector(`.element-btn[data-key="${key}"]`);
            if (btn) {
                btn.click();
                e.preventDefault();
            }
        });
    }

    generateElementDescription(element) {
        const lines = [];

        // State and basic properties
        const basicProps = [];
        if (element.state) basicProps.push(element.state);

        // Density
        if (element.density !== undefined) {
            if (element.density === 0) basicProps.push('weightless');
            else if (element.density < 2) basicProps.push('light');
            else if (element.density < 5) basicProps.push('medium');
            else if (element.density < 8) basicProps.push('heavy');
            else basicProps.push('very heavy');
        }

        // Movable
        if (element.movable === false) {
            basicProps.push('static');
        } else if (element.movable === true) {
            basicProps.push('movable');
        }

        if (basicProps.length > 0) {
            lines.push(basicProps.join(' • '));
        }

        // Combustible
        if (Array.isArray(element.tags) && element.tags.includes('combustible')) {
            if (element.ignitionResistance > 0.9) {
                lines.push('🔥 fire resistant');
            } else if (element.ignitionResistance > 0.5) {
                lines.push('🔥 flammable');
            } else {
                lines.push('🔥 very flammable');
            }

            if (element.burnsInto) {
                lines.push(`→ burns into ${element.burnsInto}`);
            }
        }

        // Explosive
        if (Array.isArray(element.tags) && element.tags.includes('explosive')) {
            lines.push('💥 explosive');
        }

        // Brush properties
        if (element.brushSize !== undefined) {
            const brushText = element.brushSize === 0 ? 'single pixel' : `${element.brushSize}px brush`;
            lines.push(`🖌️ ${brushText}`);
        }

        return lines.join('\n');
    }

    startDrawing(pointer) {
        this.isDrawing = true;
        this.draw(pointer);
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    draw(pointer) {
        if (!this.isDrawing) return;

        const gridX = Math.floor(pointer.x / this.pixelSize);
        const gridY = Math.floor(pointer.y / this.pixelSize);

        const element = this.selectedElement === 'eraser'
            ? this.elementRegistry.get('empty')
            : this.elementRegistry.get(this.selectedElement);

        if (!element) return;

        // Use element's brush size and emission density
        const brushSize = element.brushSize;
        const emissionDensity = element.emissionDensity;

        // Don't generate boulder IDs for user-drawn stones - let them fall individually
        const boulderId = null;

        // Draw in a circle around the cursor
        for (let dy = -brushSize; dy <= brushSize; dy++) {
            for (let dx = -brushSize; dx <= brushSize; dx++) {
                if (dx * dx + dy * dy <= brushSize * brushSize) {
                    // Apply emission density (probability of spawning)
                    if (Math.random() < emissionDensity) {
                        this.pixelGrid.setElement(gridX + dx, gridY + dy, element, false, boulderId);
                    }
                }
            }
        }
    }

    update() {
        // Update day/night cycle
        this.dayNightCycle.time = (this.dayNightCycle.time + this.dayNightCycle.speed) % 1.0;

        // Update physics
        this.pixelGrid.update();

        // Render everything with atmospheric effects
        this.render();

        // Update stats
        this.fpsText.textContent = Math.round(this.game.loop.actualFps);
        this.particlesText.textContent = this.pixelGrid.particleCount;
    }

    render() {
        const { width, height } = this.sys.game.config;
        const time = this.dayNightCycle.time;

        // 1. RENDER SKY GRADIENT
        this.renderSky(width, height, time);

        // 2. RENDER SUN/MOON
        this.renderCelestialBodies(width, height, time);

        // 3. RENDER PIXEL GRID WITH LIGHTING
        this.graphics.clear();
        const lightingColor = this.getLightingColor(time);

        for (let y = 0; y < this.pixelGrid.height; y++) {
            for (let x = 0; x < this.pixelGrid.width; x++) {
                const cell = this.pixelGrid.grid[y][x];
                if (cell.element.id !== 0) {
                    // Apply atmospheric lighting to particle colors
                    const tintedColor = this.applyLighting(cell.element.color, lightingColor);
                    this.graphics.fillStyle(tintedColor, 1);
                    this.graphics.fillRect(
                        x * this.pixelSize,
                        y * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }

        // 4. RENDER ATMOSPHERIC OVERLAY
        this.renderAtmosphere(width, height, time);
    }

    renderSky(width, height, time) {
        this.skyGraphics.clear();

        // Sky gradient colors based on time of day
        let skyColors;

        if (time < 0.2) {
            // Night (midnight to pre-dawn)
            skyColors = { top: 0x000033, bottom: 0x000055 };
        } else if (time < 0.3) {
            // Dawn
            const t = (time - 0.2) / 0.1;
            skyColors = {
                top: this.lerpColor(0x000033, 0xff6b35, t),
                bottom: this.lerpColor(0x000055, 0xffa500, t)
            };
        } else if (time < 0.4) {
            // Sunrise to day
            const t = (time - 0.3) / 0.1;
            skyColors = {
                top: this.lerpColor(0xff6b35, 0x87ceeb, t),
                bottom: this.lerpColor(0xffa500, 0x87ceeb, t)
            };
        } else if (time < 0.65) {
            // Day
            skyColors = { top: 0x87ceeb, bottom: 0x87ceeb };
        } else if (time < 0.75) {
            // Dusk
            const t = (time - 0.65) / 0.1;
            skyColors = {
                top: this.lerpColor(0x87ceeb, 0xff6b35, t),
                bottom: this.lerpColor(0x87ceeb, 0xff4500, t)
            };
        } else if (time < 0.85) {
            // Sunset to night
            const t = (time - 0.75) / 0.1;
            skyColors = {
                top: this.lerpColor(0xff6b35, 0x000033, t),
                bottom: this.lerpColor(0xff4500, 0x000055, t)
            };
        } else {
            // Night
            skyColors = { top: 0x000033, bottom: 0x000055 };
        }

        // Draw gradient sky
        this.skyGraphics.fillGradientStyle(skyColors.top, skyColors.top, skyColors.bottom, skyColors.bottom, 1);
        this.skyGraphics.fillRect(0, 0, width, height);
    }

    renderCelestialBodies(width, height, time) {
        this.celestialGraphics.clear();

        // Sun position: rises at 0.25 (dawn), peaks at 0.5 (noon), sets at 0.75 (dusk)
        // Map time to angle: 0.25→0° (east/left), 0.5→90° (zenith/top), 0.75→180° (west/right)
        const sunPhase = (time - 0.25) / 0.5; // 0 to 1 for sunrise to sunset
        const sunAngle = sunPhase * Math.PI; // 0 to π (half circle from left to right)

        // Arc from left (0) → top (π/2) → right (π)
        // X: starts at left (negative), peaks at center, ends at right (positive)
        // Y: starts at horizon (height), peaks at top (0), ends at horizon (height)
        const sunX = width / 2 + Math.cos(Math.PI - sunAngle) * width * 0.45; // Mirror horizontally
        const sunY = height - Math.sin(sunAngle) * height * 0.5; // Start from bottom

        // Moon position (opposite of sun - 12 hours offset = +0.5 time)
        const moonTime = (time + 0.5) % 1.0;
        const moonPhase = (moonTime - 0.25) / 0.5;
        const moonAngle = moonPhase * Math.PI;
        const moonX = width / 2 + Math.cos(Math.PI - moonAngle) * width * 0.45;
        const moonY = height - Math.sin(moonAngle) * height * 0.5;

        // Draw sun (visible during day)
        if (time > 0.2 && time < 0.8) {
            this.celestialGraphics.fillStyle(0xffff00, 1);
            this.celestialGraphics.fillCircle(sunX, sunY, this.dayNightCycle.sunRadius);
            // Sun glow
            this.celestialGraphics.fillStyle(0xffa500, 0.3);
            this.celestialGraphics.fillCircle(sunX, sunY, this.dayNightCycle.sunRadius * 1.5);
        }

        // Draw moon (visible during night)
        if (time < 0.3 || time > 0.7) {
            this.celestialGraphics.fillStyle(0xf0f0f0, 0.9);
            this.celestialGraphics.fillCircle(moonX, moonY, this.dayNightCycle.moonRadius);
            // Moon glow
            this.celestialGraphics.fillStyle(0xcccccc, 0.2);
            this.celestialGraphics.fillCircle(moonX, moonY, this.dayNightCycle.moonRadius * 1.3);
        }
    }

    renderAtmosphere(width, height, time) {
        this.overlayGraphics.clear();

        // Atmospheric overlay (subtle tint)
        let overlayColor, overlayAlpha;

        if (time < 0.2 || time > 0.85) {
            // Night - dark blue overlay
            overlayColor = 0x000033;
            overlayAlpha = 0.3;
        } else if (time < 0.3) {
            // Dawn - orange overlay
            const t = (time - 0.2) / 0.1;
            overlayColor = 0xff6b35;
            overlayAlpha = 0.2 * (1 - t);
        } else if (time < 0.65) {
            // Day - no overlay
            overlayAlpha = 0;
        } else if (time < 0.75) {
            // Dusk - orange/red overlay
            const t = (time - 0.65) / 0.1;
            overlayColor = 0xff6b35;
            overlayAlpha = 0.2 * t;
        } else {
            // Transitioning to night
            overlayColor = 0x000033;
            overlayAlpha = 0.3 * ((time - 0.75) / 0.1);
        }

        if (overlayAlpha > 0) {
            this.overlayGraphics.fillStyle(overlayColor, overlayAlpha);
            this.overlayGraphics.fillRect(0, 0, width, height);
        }
    }

    getLightingColor(time) {
        // Return RGB multipliers for lighting (1.0 = full brightness, 0.5 = half brightness)
        if (time < 0.2 || time > 0.85) {
            // Night - blue-tinted, darker
            return { r: 0.3, g: 0.3, b: 0.5 };
        } else if (time < 0.3) {
            // Dawn - warm, getting brighter
            const t = (time - 0.2) / 0.1;
            return {
                r: 0.3 + 0.5 * t,
                g: 0.3 + 0.5 * t,
                b: 0.5 + 0.3 * t
            };
        } else if (time < 0.65) {
            // Day - full brightness
            return { r: 1.0, g: 1.0, b: 1.0 };
        } else if (time < 0.75) {
            // Dusk - warm, getting darker
            const t = (time - 0.65) / 0.1;
            return {
                r: 1.0 - 0.2 * t,
                g: 1.0 - 0.3 * t,
                b: 1.0 - 0.3 * t
            };
        } else {
            // Transitioning to night
            const t = (time - 0.75) / 0.1;
            return {
                r: 0.8 - 0.5 * t,
                g: 0.7 - 0.4 * t,
                b: 0.7 - 0.2 * t
            };
        }
    }

    applyLighting(color, lighting) {
        // Extract RGB from hex color
        const r = ((color >> 16) & 0xFF) * lighting.r;
        const g = ((color >> 8) & 0xFF) * lighting.g;
        const b = (color & 0xFF) * lighting.b;

        // Reconstruct color
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    lerpColor(color1, color2, t) {
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;

        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;

        const r = Math.floor(r1 + (r2 - r1) * t);
        const g = Math.floor(g1 + (g2 - g1) * t);
        const b = Math.floor(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }
}

// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: Math.min(window.innerWidth, 800),
    height: Math.min(window.innerHeight, 600),
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: GameScene,
    render: {
        pixelArt: true,
        antialias: false
    },
    fps: {
        target: 60,
        forceSetTimeOut: false
    }
};

// Initialize the game
const game = new Phaser.Game(config);
