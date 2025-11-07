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

        // Create graphics object for rendering
        this.graphics = this.add.graphics();

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

        // Define element groups
        const groups = {
            'Powders': ['sand', 'gunpowder', 'ash'],
            'Liquids': ['water', 'oil'],
            'Solids': ['stone', 'wall', 'wood', 'fossil'],
            'Nature': ['tree_seed', 'fish'],
            'Energy': ['fire'],
            'Tools': ['eraser']
        };

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
        Object.entries(groups).forEach(([groupName, elements]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'element-group';

            const label = document.createElement('div');
            label.className = 'group-label';
            label.textContent = groupName;
            groupDiv.appendChild(label);

            const elementsDiv = document.createElement('div');
            elementsDiv.className = 'group-elements';

            elements.forEach(elementName => {
                const element = this.elementRegistry.get(elementName);
                if (!element && elementName !== 'eraser') return;

                const config = elementConfigs[elementName];
                const btn = document.createElement('button');
                btn.className = 'element-btn';
                if (elementName === 'sand') btn.classList.add('active');
                btn.dataset.element = elementName;
                btn.style.background = config.color;
                btn.textContent = config.icon;

                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';

                const tooltipName = document.createElement('div');
                tooltipName.className = 'tooltip-name';
                tooltipName.textContent = elementName.replace(/_/g, ' ').toUpperCase();
                tooltip.appendChild(tooltipName);

                if (element) {
                    const tooltipProps = document.createElement('div');
                    tooltipProps.className = 'tooltip-props';
                    tooltipProps.textContent = this.generateElementDescription(element);
                    tooltip.appendChild(tooltipProps);
                }

                btn.appendChild(tooltip);

                btn.addEventListener('click', () => {
                    document.querySelectorAll('.element-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.selectedElement = elementName;
                });

                elementsDiv.appendChild(btn);
            });

            groupDiv.appendChild(elementsDiv);
            selector.appendChild(groupDiv);
        });
    }

    generateElementDescription(element) {
        const parts = [];

        // State
        if (element.state) {
            parts.push(element.state);
        }

        // Density
        if (element.density !== undefined) {
            if (element.density === 0) parts.push('weightless');
            else if (element.density < 2) parts.push('light');
            else if (element.density < 5) parts.push('medium');
            else parts.push('heavy');
        }

        // Movable
        if (element.movable === false) {
            parts.push('static');
        } else if (element.movable === true) {
            parts.push('movable');
        }

        // Combustible
        if (element.tags && element.tags.includes('combustible')) {
            if (element.ignitionResistance > 0.9) {
                parts.push('fire resistant');
            } else if (element.ignitionResistance > 0.5) {
                parts.push('flammable');
            } else {
                parts.push('very flammable');
            }
        }

        return parts.join(' • ');
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

        // Generate unique boulder ID for stone elements (element.id === 3)
        const boulderId = element.id === 3 ? this.nextBoulderId++ : null;

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
        // Update physics
        this.pixelGrid.update();

        // Render the grid
        this.render();

        // Update stats
        this.fpsText.textContent = Math.round(this.game.loop.actualFps);
        this.particlesText.textContent = this.pixelGrid.particleCount;
    }

    render() {
        this.graphics.clear();

        // Use batched drawing for better performance
        for (let y = 0; y < this.pixelGrid.height; y++) {
            for (let x = 0; x < this.pixelGrid.width; x++) {
                const cell = this.pixelGrid.grid[y][x];
                if (cell.element.id !== 0) {
                    this.graphics.fillStyle(cell.element.color, 1);
                    this.graphics.fillRect(
                        x * this.pixelSize,
                        y * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
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
