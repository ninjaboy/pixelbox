import registry from './init.js';
import PixelGrid from './PixelGrid.js';
import { VERSION } from '../version.js';
import profiler from './Profiler.js';

// Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.selectedElement = 'sand';
        this.isDrawing = false;
        this.elementRegistry = registry; // Use elementRegistry to avoid Phaser's built-in registry
        this.nextBoulderId = 1; // Unique ID counter for stone boulders
        this.playerX = null; // Player position
        this.playerY = null;
        this.buildMode = true; // Start in build mode (press B to switch to explore mode)
        this.keys = {}; // Track key states
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Create pixel grid (4x4 pixel size for better performance on mobile)
        this.pixelSize = 4;
        this.pixelGrid = new PixelGrid(width, height, this.pixelSize, this.elementRegistry);

        // DAY/NIGHT CYCLE SYSTEM
        this.dayNightCycle = {
            time: 0.35, // Start at morning (0.25 = sunrise/6AM, 0.35 = 8AM morning)
            speed: 0.0001, // How fast time passes (full cycle = 10,000 frames = ~2.7 minutes at 60fps)
            sunRadius: 25,  // Larger sun
            moonRadius: 18,  // Larger moon

            // MOON CYCLE - randomized start but cycles faster
            moonPhase: Math.random(), // Random phase (0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter)
            moonCycleSpeed: 0.0001 / 4, // Moon changes 7x faster (full cycle = ~40 seconds at 60fps)
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
        this.versionText = document.getElementById('version');
        this.modeDisplay = document.getElementById('mode-display');

        // Set version once
        this.versionText.textContent = VERSION;

        // Initialize mode display
        this.updateModeDisplay();

        // Debug: Log renderer info
        console.log('PixelBox initialized:', {
            renderer: this.sys.game.renderer.type === 0 ? 'HEADLESS' : this.sys.game.renderer.type === 1 ? 'CANVAS' : 'WEBGL',
            resolution: window.devicePixelRatio,
            size: `${width}x${height}`,
            pixelSize: this.pixelSize
        });

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
        const globalTooltip = document.getElementById('global-tooltip');
        const tooltipName = document.getElementById('tooltip-name');
        const tooltipProps = document.getElementById('tooltip-props');
        const tooltipKey = document.getElementById('tooltip-key');

        // Define elements with keybindings, grouped by category
        const elements = [
            // TERRAIN
            { name: 'sand', key: '1' },
            { name: 'stone', key: '2' },
            { name: 'wall', key: '3' },
            { name: 'glass', key: '4' },
            { type: 'separator' },
            // LIQUIDS
            { name: 'water', key: '5' },
            { name: 'oil', key: '6' },
            { name: 'acid', key: '7' },
            { type: 'separator' },
            // TEMPERATURE
            { name: 'fire', key: '8' },
            { name: 'ice', key: '9' },
            { name: 'lava', key: '0' },
            { type: 'separator' },
            // LIFE
            { name: 'tree_seed', key: 'Q' },
            { name: 'plant', key: 'W' },
            { name: 'fish', key: 'E' },
            { type: 'separator' },
            // OTHER
            { name: 'wood', key: 'R' },
            { name: 'gunpowder', key: 'T' },
            { type: 'separator' },
            // TOOLS
            { name: 'eraser', key: 'X' }
        ];

        // Element visual configs - using universal symbols for cross-platform consistency
        const elementConfigs = {
            sand: { icon: '∙∙', color: '#c2b280' },
            water: { icon: '≋', color: '#4a90e2' },
            stone: { icon: '▪', color: '#666' },
            wall: { icon: '▉', color: '#444' },
            fire: { icon: '▲', color: '#ff6b35' },
            wood: { icon: '▥', color: '#8b4513' },
            oil: { icon: '◐', color: '#3d3d1a' },
            gunpowder: { icon: '◉', color: '#333' },
            fossil: { icon: '⚔', color: '#8b7355' },
            fish: { icon: '◭', color: '#1a5f7a' },
            tree_seed: { icon: '⦿', color: '#654321' },
            ash: { icon: '∵', color: '#999' },
            ice: { icon: '❆', color: '#87ceeb' },
            salt: { icon: '▫', color: '#ffffff' },
            glass: { icon: '◇', color: '#add8e6' },
            lava: { icon: '▼', color: '#ff4500' },
            acid: { icon: '☠', color: '#7fff00' },
            plant: { icon: '♣', color: '#32cd32' },
            eraser: { icon: '✕', color: '#ff3333' }
        };

        // Build UI
        elements.forEach(({ name: elementName, key, type }) => {
            // Handle separators
            if (type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'element-separator';
                selector.appendChild(separator);
                return;
            }

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

            // Handle tooltip with global tooltip element
            const showTooltip = (e) => {
                // Update tooltip content
                tooltipName.textContent = elementName.replace(/_/g, ' ');

                if (element) {
                    const description = this.generateElementDescription(element);
                    tooltipProps.textContent = description;
                } else {
                    tooltipProps.textContent = 'Tool';
                }

                tooltipKey.textContent = `Press ${key}`;

                // Position tooltip above button with smart boundary detection
                const rect = btn.getBoundingClientRect();
                globalTooltip.style.display = 'block'; // Show first to measure width

                const tooltipRect = globalTooltip.getBoundingClientRect();
                const tooltipWidth = tooltipRect.width;

                // Calculate centered position
                let leftPos = rect.left + rect.width / 2;
                let transform = 'translateX(-50%)';

                // Check if tooltip would go off-screen on the left
                if (leftPos - tooltipWidth / 2 < 10) {
                    leftPos = rect.left;
                    transform = 'translateX(0)';
                }
                // Check if tooltip would go off-screen on the right
                else if (leftPos + tooltipWidth / 2 > window.innerWidth - 10) {
                    leftPos = rect.right;
                    transform = 'translateX(-100%)';
                }

                globalTooltip.style.left = `${leftPos}px`;
                globalTooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
                globalTooltip.style.transform = transform;
            };

            const hideTooltip = () => {
                globalTooltip.style.display = 'none';
            };

            // Desktop: show on hover
            btn.addEventListener('mouseenter', showTooltip);
            btn.addEventListener('mouseleave', hideTooltip);

            // Selection handler (shared between click and touch)
            const selectElement = () => {
                document.querySelectorAll('.element-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedElement = elementName;
            };

            // Mobile: show only while actively pressing and handle selection
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent mouse events from also firing
                showTooltip(e);
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent click event from firing
                hideTooltip();
                selectElement(); // Select on touch
            });
            btn.addEventListener('touchcancel', hideTooltip);

            // Desktop: handle click
            btn.addEventListener('click', selectElement);

            selector.appendChild(btn);
        });

        // Add keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();

            // Toggle build mode with B key
            if (key === 'B') {
                this.buildMode = !this.buildMode;
                console.log(this.buildMode ? '🔨 Build mode ON' : '🚶 Explore mode ON');

                // Update persistent mode display in stats
                this.updateModeDisplay();

                // Show temporary notification
                const indicator = document.getElementById('mode-indicator') || this.createModeIndicator();
                indicator.textContent = this.buildMode ? '🔨 Build Mode' : '🚶 Explore Mode';
                indicator.style.display = 'block';
                setTimeout(() => { indicator.style.display = 'none'; }, 2000);
                e.preventDefault();
                return;
            }

            // Toggle profiler with P key
            if (key === 'P') {
                const enabled = profiler.toggle();
                const panel = document.getElementById('profiler-panel');
                panel.style.display = enabled ? 'block' : 'none';
                console.log(enabled ? '📊 Profiler enabled' : '📊 Profiler disabled');
                e.preventDefault();
                return;
            }

            // Arrow keys for player movement (only in explore mode)
            if (!this.buildMode) {
                if (key === 'ARROWLEFT' || key === 'A') {
                    this.keys.left = true;
                    e.preventDefault();
                    return;
                }
                if (key === 'ARROWRIGHT' || key === 'D') {
                    this.keys.right = true;
                    e.preventDefault();
                    return;
                }
                if (key === 'ARROWUP' || key === 'W' || key === ' ') {
                    this.keys.jump = true;
                    e.preventDefault();
                    return;
                }
            }

            const btn = document.querySelector(`.element-btn[data-key="${key}"]`);
            if (btn) {
                btn.click();
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ARROWLEFT' || key === 'A') this.keys.left = false;
            if (key === 'ARROWRIGHT' || key === 'D') this.keys.right = false;
            if (key === 'ARROWUP' || key === 'W' || key === ' ') this.keys.jump = false;
        });

        // Profiler panel reference
        this.profilerPanel = document.getElementById('profiler-content');

        // Spawn initial player at center-top
        this.spawnPlayer();
    }

    createModeIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'mode-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    updateModeDisplay() {
        if (this.modeDisplay) {
            if (this.buildMode) {
                this.modeDisplay.textContent = '🔨 Build';
                this.modeDisplay.style.color = '#00ffff'; // Cyan
            } else {
                this.modeDisplay.textContent = '🚶 Explore';
                this.modeDisplay.style.color = '#00ff00'; // Green
            }
        }
    }

    spawnPlayer() {
        const centerX = Math.floor(this.pixelGrid.width / 2);
        const centerY = Math.floor(this.pixelGrid.height * 0.3); // Spawn in upper middle
        const playerElement = this.elementRegistry.get('player');
        this.pixelGrid.setElement(centerX, centerY, playerElement);
        this.playerX = centerX;
        this.playerY = centerY;
        console.log(`🎮 Player spawned at (${centerX}, ${centerY})`);
    }

    findPlayer() {
        // Scan around last known position to update player coordinates
        if (this.playerX === null || this.playerY === null) return;

        const searchRadius = 5;
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                const checkX = this.playerX + dx;
                const checkY = this.playerY + dy;
                const element = this.pixelGrid.getElement(checkX, checkY);
                if (element && element.name === 'player') {
                    this.playerX = checkX;
                    this.playerY = checkY;
                    return;
                }
            }
        }
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
        // Only allow drawing in build mode
        if (this.buildMode) {
            this.isDrawing = true;
            this.draw(pointer);
        }
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
                        const targetX = gridX + dx;
                        const targetY = gridY + dy;

                        // Don't allow drawing in the border area (2 pixels from edge)
                        const borderSize = 2;
                        if (targetX < borderSize || targetX >= this.pixelGrid.width - borderSize ||
                            targetY < borderSize || targetY >= this.pixelGrid.height - borderSize) {
                            continue; // Skip border area
                        }

                        // Don't erase or overwrite the player character
                        const existingElement = this.pixelGrid.getElement(targetX, targetY);
                        if (existingElement && existingElement.name === 'player') {
                            continue; // Skip this cell, don't affect player
                        }

                        this.pixelGrid.setElement(targetX, targetY, element, false, boulderId);
                    }
                }
            }
        }
    }

    update() {
        profiler.start('frame:total');

        // Update day/night cycle
        this.dayNightCycle.time = (this.dayNightCycle.time + this.dayNightCycle.speed) % 1.0;

        // Update moon phase cycle (much slower)
        this.dayNightCycle.moonPhase = (this.dayNightCycle.moonPhase + this.dayNightCycle.moonCycleSpeed) % 1.0;

        // Handle player movement (only in explore mode) - SMOOTH continuous movement
        if (!this.buildMode && this.playerX !== null && this.playerY !== null) {
            const playerElement = this.pixelGrid.getElement(this.playerX, this.playerY);
            if (playerElement && playerElement.name === 'player') {
                // Initialize movement timer
                if (!this.movementTimer) this.movementTimer = 0;
                this.movementTimer++;

                // Smooth horizontal movement - move every 3 frames (20fps movement = smooth)
                if (this.movementTimer % 3 === 0) {
                    if (this.keys.left) {
                        const moved = playerElement.handleMovement(this.playerX, this.playerY, this.pixelGrid, 'left');
                        if (moved) this.playerX--;
                    }

                    if (this.keys.right) {
                        const moved = playerElement.handleMovement(this.playerX, this.playerY, this.pixelGrid, 'right');
                        if (moved) this.playerX++;
                    }
                }

                // Jump only once per key press (physics handles the arc)
                if (this.keys.jump && !this.lastKeyJump) {
                    playerElement.handleMovement(this.playerX, this.playerY, this.pixelGrid, 'jump');
                    // Don't manually update playerY - let physics handle it
                    this.lastKeyJump = true;
                } else if (!this.keys.jump) {
                    this.lastKeyJump = false;
                }
            }
        }

        // Update physics
        profiler.start('physics:update');
        this.pixelGrid.update();
        profiler.end('physics:update');

        // Update player position after physics update
        this.findPlayer();

        // Render everything with atmospheric effects
        profiler.start('render:total');
        this.render();
        profiler.end('render:total');

        // Update stats
        this.fpsText.textContent = Math.round(this.game.loop.actualFps);
        this.particlesText.textContent = this.pixelGrid.particleCount;

        // Update profiler panel if enabled
        if (profiler.enabled) {
            this.updateProfilerPanel();
        }

        profiler.end('frame:total');
    }

    render() {
        const { width, height } = this.sys.game.config;
        const time = this.dayNightCycle.time;

        // 1. RENDER SKY GRADIENT
        profiler.start('render:sky');
        this.renderSky(width, height, time);
        profiler.end('render:sky');

        // 2. RENDER SUN/MOON
        profiler.start('render:celestial');
        this.renderCelestialBodies(width, height, time);
        profiler.end('render:celestial');

        // 3. RENDER PIXEL GRID WITH LIGHTING
        profiler.start('render:particles');
        this.graphics.clear();
        const lightingColor = this.getLightingColor(time);

        // CRITICAL FIX: Only render active (non-empty) cells, batched by color
        const particlesByColor = new Map();

        for (const [numericKey] of this.pixelGrid.activeCells) {
            const { x, y } = this.pixelGrid.keyToCoord(numericKey);
            const cell = this.pixelGrid.grid[y]?.[x];

            if (cell && cell.element.id !== 0) {
                // Use per-cell color if available (for fish), otherwise use element color
                const baseColor = cell.data.fishColor || cell.element.color;

                // Apply atmospheric lighting to particle colors
                const tintedColor = this.applyLighting(baseColor, lightingColor);

                if (!particlesByColor.has(tintedColor)) {
                    particlesByColor.set(tintedColor, []);
                }
                particlesByColor.get(tintedColor).push({ x, y });
            }
        }

        // Render all particles of the same color in one batch
        for (const [color, particles] of particlesByColor) {
            this.graphics.fillStyle(color, 1);
            for (const { x, y } of particles) {
                this.graphics.fillRect(
                    x * this.pixelSize,
                    y * this.pixelSize,
                    this.pixelSize,
                    this.pixelSize
                );
            }
        }
        profiler.end('render:particles');

        // 4. RENDER WORLD BORDER (visual only, not particles)
        profiler.start('render:border');
        this.renderWorldBorder();
        profiler.end('render:border');

        // 5. RENDER ATMOSPHERIC OVERLAY
        profiler.start('render:atmosphere');
        this.renderAtmosphere(width, height, time);
        profiler.end('render:atmosphere');
    }

    renderWorldBorder() {
        const borderThickness = this.pixelSize * 2; // 2 pixels thick
        const { width, height } = this.sys.game.config;

        // Use a dedicated graphics object for the border
        if (!this.borderGraphics) {
            this.borderGraphics = this.add.graphics();
            this.borderGraphics.setDepth(1000); // Above particles
        }

        this.borderGraphics.clear();

        // Dark stone-like border color with slight transparency
        this.borderGraphics.lineStyle(borderThickness, 0x404040, 1);

        // Draw border rectangle (inset by half border thickness)
        const inset = borderThickness / 2;
        this.borderGraphics.strokeRect(inset, inset, width - borderThickness, height - borderThickness);

        // Add inner shadow effect for depth
        this.borderGraphics.lineStyle(this.pixelSize, 0x202020, 0.5);
        this.borderGraphics.strokeRect(
            inset + this.pixelSize,
            inset + this.pixelSize,
            width - borderThickness - this.pixelSize * 2,
            height - borderThickness - this.pixelSize * 2
        );
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

        // Use smooth sine curve for both X and Y (no easing = smooth motion throughout)
        const baseX = Math.cos(Math.PI - sunAngle);
        const baseY = Math.sin(sunAngle);

        // Wider arc with smooth movement
        const horizontalScale = 0.5; // Increased from 0.35 to make arc wider

        // Vertical range: from 20% of height (entry point) to 95% of height (peak)
        // This makes sun/moon enter screen at 20% not at bottom
        const minHeight = 0.20; // Enter at 20% of height from bottom
        const maxHeight = 0.95; // Peak at 95% of height
        const verticalRange = maxHeight - minHeight;

        const sunX = width / 2 + baseX * width * horizontalScale;
        const sunY = height - (minHeight + baseY * verticalRange) * height;

        // Moon position (opposite of sun - 12 hours offset = +0.5 time)
        const moonTime = (time + 0.5) % 1.0;
        const moonPhase = (moonTime - 0.25) / 0.5;
        const moonAngle = moonPhase * Math.PI;

        const moonBaseX = Math.cos(Math.PI - moonAngle);
        const moonBaseY = Math.sin(moonAngle);

        const moonX = width / 2 + moonBaseX * width * horizontalScale;
        const moonY = height - (minHeight + moonBaseY * verticalRange) * height;

        // Draw sun (visible during day) with better visuals
        if (time > 0.2 && time < 0.8) {
            // Sun core (bright yellow)
            this.celestialGraphics.fillStyle(0xffff00, 1);
            this.celestialGraphics.fillCircle(sunX, sunY, this.dayNightCycle.sunRadius);

            // Sun corona (orange glow - multiple layers)
            this.celestialGraphics.fillStyle(0xffa500, 0.4);
            this.celestialGraphics.fillCircle(sunX, sunY, this.dayNightCycle.sunRadius * 1.4);
            this.celestialGraphics.fillStyle(0xff8c00, 0.2);
            this.celestialGraphics.fillCircle(sunX, sunY, this.dayNightCycle.sunRadius * 1.8);
            this.celestialGraphics.fillStyle(0xff6b35, 0.1);
            this.celestialGraphics.fillCircle(sunX, sunY, this.dayNightCycle.sunRadius * 2.2);
        }

        // Draw moon with phases (visible during night)
        if (time < 0.3 || time > 0.7) {
            const moonPhase = this.dayNightCycle.moonPhase;
            const radius = this.dayNightCycle.moonRadius;

            // Moon base (light gray)
            this.celestialGraphics.fillStyle(0xf0f0f0, 0.95);
            this.celestialGraphics.fillCircle(moonX, moonY, radius);

            // Moon phase shadow
            if (moonPhase < 0.5) {
                // Waxing (0 to 0.5): shadow on left side
                const shadowWidth = radius * 2 * (0.5 - moonPhase) * 2;
                this.celestialGraphics.fillStyle(0x1a1a2e, 0.8);
                this.celestialGraphics.fillCircle(moonX - shadowWidth / 2, moonY, shadowWidth);
            } else if (moonPhase > 0.5) {
                // Waning (0.5 to 1.0): shadow on right side
                const shadowWidth = radius * 2 * (moonPhase - 0.5) * 2;
                this.celestialGraphics.fillStyle(0x1a1a2e, 0.8);
                this.celestialGraphics.fillCircle(moonX + shadowWidth / 2, moonY, shadowWidth);
            }
            // moonPhase === 0.5 is full moon (no shadow)

            // Moon glow
            this.celestialGraphics.fillStyle(0xe8e8ff, 0.3);
            this.celestialGraphics.fillCircle(moonX, moonY, radius * 1.5);
            this.celestialGraphics.fillStyle(0xd0d0ff, 0.15);
            this.celestialGraphics.fillCircle(moonX, moonY, radius * 2.0);
        }
    }

    renderAtmosphere(width, height, time) {
        this.overlayGraphics.clear();

        // HIGH ATMOSPHERE LAYER (top 15% of screen)
        const atmosphereHeight = height * 0.15;
        let atmosphereColor, atmosphereAlpha;

        if (time < 0.2 || time > 0.85) {
            // Night - deep blue/purple gradient
            atmosphereColor = 0x0a0a3a;
            atmosphereAlpha = 0.6;
        } else if (time < 0.3) {
            // Dawn - orange/pink gradient
            const t = (time - 0.2) / 0.1;
            atmosphereColor = this.lerpColor(0x0a0a3a, 0xff8c42, t);
            atmosphereAlpha = 0.6;
        } else if (time < 0.4) {
            // Morning - light blue
            const t = (time - 0.3) / 0.1;
            atmosphereColor = this.lerpColor(0xff8c42, 0x87ceeb, t);
            atmosphereAlpha = 0.5;
        } else if (time < 0.65) {
            // Day - light sky blue
            atmosphereColor = 0x87ceeb;
            atmosphereAlpha = 0.4;
        } else if (time < 0.75) {
            // Dusk - orange/red gradient
            const t = (time - 0.65) / 0.1;
            atmosphereColor = this.lerpColor(0x87ceeb, 0xff6b35, t);
            atmosphereAlpha = 0.5;
        } else if (time < 0.85) {
            // Evening - purple/blue
            const t = (time - 0.75) / 0.1;
            atmosphereColor = this.lerpColor(0xff6b35, 0x0a0a3a, t);
            atmosphereAlpha = 0.6;
        } else {
            // Night
            atmosphereColor = 0x0a0a3a;
            atmosphereAlpha = 0.6;
        }

        // Draw atmosphere with gradient fade from top to bottom
        this.overlayGraphics.fillGradientStyle(
            atmosphereColor, atmosphereColor,  // Top color
            atmosphereColor, atmosphereColor,  // Bottom color (will fade with alpha)
            atmosphereAlpha, atmosphereAlpha,  // Top alpha
            0, 0                               // Bottom alpha (fades to transparent)
        );
        this.overlayGraphics.fillRect(0, 0, width, atmosphereHeight);

        // FULL SCREEN OVERLAY (subtle tint over everything)
        let overlayColor, overlayAlpha;

        if (time < 0.2 || time > 0.85) {
            // Night - dark blue overlay (reduced from 0.3 to 0.2)
            overlayColor = 0x000033;
            overlayAlpha = 0.2;
        } else if (time < 0.3) {
            // Dawn - orange overlay (reduced)
            const t = (time - 0.2) / 0.1;
            overlayColor = 0xff6b35;
            overlayAlpha = 0.15 * (1 - t);
        } else if (time < 0.65) {
            // Day - no overlay
            overlayAlpha = 0;
        } else if (time < 0.75) {
            // Dusk - orange/red overlay (reduced)
            const t = (time - 0.65) / 0.1;
            overlayColor = 0xff6b35;
            overlayAlpha = 0.15 * t;
        } else {
            // Transitioning to night (reduced)
            overlayColor = 0x000033;
            overlayAlpha = 0.2 * ((time - 0.75) / 0.1);
        }

        if (overlayAlpha > 0) {
            this.overlayGraphics.fillStyle(overlayColor, overlayAlpha);
            this.overlayGraphics.fillRect(0, 0, width, height);
        }
    }

    getLightingColor(time) {
        // Return RGB multipliers for lighting (more subtle for better visibility)
        if (time < 0.2 || time > 0.85) {
            // Night - blue-tinted, but not as dark (increased from 0.3 to 0.5)
            return { r: 0.5, g: 0.5, b: 0.7 };
        } else if (time < 0.3) {
            // Dawn - warm, getting brighter
            const t = (time - 0.2) / 0.1;
            return {
                r: 0.5 + 0.5 * t,
                g: 0.5 + 0.5 * t,
                b: 0.7 + 0.3 * t
            };
        } else if (time < 0.65) {
            // Day - full brightness
            return { r: 1.0, g: 1.0, b: 1.0 };
        } else if (time < 0.75) {
            // Dusk - warm, getting darker (less dramatic)
            const t = (time - 0.65) / 0.1;
            return {
                r: 1.0 - 0.15 * t,
                g: 1.0 - 0.2 * t,
                b: 1.0 - 0.2 * t
            };
        } else {
            // Transitioning to night (less dramatic)
            const t = (time - 0.75) / 0.1;
            return {
                r: 0.85 - 0.35 * t,
                g: 0.8 - 0.3 * t,
                b: 0.8 - 0.1 * t
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

    updateProfilerPanel() {
        if (!this.profilerPanel) return;

        const metrics = profiler.getMetrics();
        const bottlenecks = profiler.getBottlenecks(10);

        // Helper to format time with color coding
        const formatTime = (ms) => {
            const cssClass = ms > 10 ? 'critical' : ms > 5 ? 'warn' : '';
            return { value: ms.toFixed(3), cssClass };
        };

        // Build HTML
        let html = '';

        // Frame timing overview
        html += '<div class="section">';
        html += '<h3>Frame Timing</h3>';

        const frameTotal = formatTime(metrics['frame:total']?.avg || 0);
        const physicsUpdate = formatTime(metrics['physics:update']?.avg || 0);
        const renderTotal = formatTime(metrics['render:total']?.avg || 0);

        html += `<div class="metric ${frameTotal.cssClass}">
            <span class="metric-name">Total Frame</span>
            <span class="metric-value">${frameTotal.value}ms</span>
        </div>`;
        html += `<div class="metric ${physicsUpdate.cssClass}">
            <span class="metric-name">└─ Physics Update</span>
            <span class="metric-value">${physicsUpdate.value}ms</span>
        </div>`;
        html += `<div class="metric ${renderTotal.cssClass}">
            <span class="metric-name">└─ Render Total</span>
            <span class="metric-value">${renderTotal.value}ms</span>
        </div>`;
        html += '</div>';

        // Render breakdown
        html += '<div class="section">';
        html += '<h3>Render Breakdown</h3>';

        const renderSky = formatTime(metrics['render:sky']?.avg || 0);
        const renderCelestial = formatTime(metrics['render:celestial']?.avg || 0);
        const renderParticles = formatTime(metrics['render:particles']?.avg || 0);
        const renderAtmosphere = formatTime(metrics['render:atmosphere']?.avg || 0);

        html += `<div class="metric">
            <span class="metric-name">Sky</span>
            <span class="metric-value">${renderSky.value}ms</span>
        </div>`;
        html += `<div class="metric">
            <span class="metric-name">Celestial</span>
            <span class="metric-value">${renderCelestial.value}ms</span>
        </div>`;
        html += `<div class="metric ${renderParticles.cssClass}">
            <span class="metric-name">Particles</span>
            <span class="metric-value">${renderParticles.value}ms</span>
        </div>`;
        html += `<div class="metric">
            <span class="metric-name">Atmosphere</span>
            <span class="metric-value">${renderAtmosphere.value}ms</span>
        </div>`;
        html += '</div>';

        // Element updates (if profiled)
        const elementMetrics = Object.entries(metrics)
            .filter(([key]) => key.startsWith('element:'))
            .sort((a, b) => b[1].avg - a[1].avg);

        if (elementMetrics.length > 0) {
            html += '<div class="section">';
            html += '<h3>Element Updates (Top 5)</h3>';
            elementMetrics.slice(0, 5).forEach(([key, data]) => {
                const name = key.replace('element:', '');
                const time = formatTime(data.avg);
                html += `<div class="metric ${time.cssClass}">
                    <span class="metric-name">${name}</span>
                    <span class="metric-value">${time.value}ms</span>
                </div>`;
            });
            html += '</div>';
        }

        // System info
        html += '<div class="section">';
        html += '<h3>System Info</h3>';
        html += `<div class="metric">
            <span class="metric-name">Active Cells</span>
            <span class="metric-value">${this.pixelGrid.activeCells.size}</span>
        </div>`;
        html += `<div class="metric">
            <span class="metric-name">Target FPS</span>
            <span class="metric-value">60</span>
        </div>`;
        const budgetMs = 16.67;
        const frameMs = metrics['frame:total']?.avg || 0;
        const budget = formatTime(budgetMs - frameMs);
        html += `<div class="metric ${budget.cssClass}">
            <span class="metric-name">Frame Budget</span>
            <span class="metric-value">${budget.value}ms</span>
        </div>`;
        html += '</div>';

        this.profilerPanel.innerHTML = html;
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
    },
    // Clamp resolution to prevent high-DPR performance issues
    resolution: Math.min(window.devicePixelRatio || 1, 2)
};

// Initialize the game with duplicate instance protection
if (window.__pixelboxGame) {
    console.log('Destroying existing game instance');
    window.__pixelboxGame.destroy(true);
}
window.__pixelboxGame = new Phaser.Game(config);
