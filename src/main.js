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
        const stoneElement = this.elementRegistry.get('stone');

        if (!stoneElement) {
            console.error('Stone element not found in registry!');
            return;
        }

        // Bottom border
        for (let x = 0; x < this.pixelGrid.width; x++) {
            for (let i = 0; i < 3; i++) {
                this.pixelGrid.setElement(x, this.pixelGrid.height - 1 - i, stoneElement);
            }
        }

        // Side borders
        for (let y = 0; y < this.pixelGrid.height; y++) {
            for (let i = 0; i < 3; i++) {
                this.pixelGrid.setElement(i, y, stoneElement);
                this.pixelGrid.setElement(this.pixelGrid.width - 1 - i, y, stoneElement);
            }
        }
    }

    setupElementSelector() {
        const buttons = document.querySelectorAll('.element-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedElement = btn.dataset.element;
            });
        });
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
