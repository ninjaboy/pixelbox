// Pixel Grid Class - manages the particle simulation with element objects
class PixelGrid {
    constructor(width, height, pixelSize) {
        this.width = Math.floor(width / pixelSize);
        this.height = Math.floor(height / pixelSize);
        this.pixelSize = pixelSize;
        this.grid = [];
        this.particleCount = 0;

        // Initialize empty grid
        const emptyElement = ElementRegistry.get('empty');
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    element: emptyElement,
                    lifetime: -1,
                    updated: false
                };
            }
        }
    }

    getCell(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.grid[y][x];
    }

    getElement(x, y) {
        const cell = this.getCell(x, y);
        return cell ? cell.element : null;
    }

    setElement(x, y, element) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const cell = this.grid[y][x];
        const wasEmpty = cell.element.id === 0;
        const isEmpty = element.id === 0;

        if (wasEmpty && !isEmpty) this.particleCount++;
        if (!wasEmpty && isEmpty) this.particleCount--;

        cell.element = element;
        cell.lifetime = element.defaultLifetime;
        cell.updated = false;
    }

    isEmpty(x, y) {
        const element = this.getElement(x, y);
        return element && element.id === 0;
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    canMoveTo(fromX, fromY, toX, toY) {
        if (!this.isInBounds(toX, toY)) return false;

        const fromElement = this.getElement(fromX, fromY);
        const toElement = this.getElement(toX, toY);

        if (!fromElement || !toElement) return false;

        // Can move into empty space
        if (toElement.id === 0) return true;

        // Can displace less dense materials
        return fromElement.density > toElement.density && toElement.movable;
    }

    swap(x1, y1, x2, y2) {
        if (!this.isInBounds(x1, y1) || !this.isInBounds(x2, y2)) return;

        const temp = this.grid[y1][x1];
        this.grid[y1][x1] = this.grid[y2][x2];
        this.grid[y2][x2] = temp;

        this.grid[y2][x2].updated = true;
    }

    update() {
        // Reset updated flags
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x].updated = false;
            }
        }

        // Update from bottom to top, randomize left-right order
        for (let y = this.height - 1; y >= 0; y--) {
            const startLeft = Math.random() > 0.5;

            for (let i = 0; i < this.width; i++) {
                const x = startLeft ? i : this.width - 1 - i;
                const cell = this.grid[y][x];

                if (cell.updated || cell.element.id === 0) continue;

                // Handle lifetime
                if (cell.lifetime > 0) {
                    cell.lifetime--;
                    if (cell.lifetime === 0) {
                        this.setElement(x, y, ElementRegistry.get('empty'));
                        continue;
                    }
                }

                // Let the element update itself
                cell.element.update(x, y, this);

                // Check for interactions with neighbors
                this.checkInteractions(x, y);
            }
        }
    }

    checkInteractions(x, y) {
        const element = this.getElement(x, y);
        if (!element || element.id === 0) return;

        // Check all adjacent cells for interactions
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of neighbors) {
            const neighborElement = this.getElement(nx, ny);
            if (neighborElement && element.canInteractWith(neighborElement)) {
                if (element.interact(x, y, nx, ny, this)) {
                    return; // Interaction occurred, stop checking
                }
            }
        }
    }
}

// Main Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.selectedElement = 'sand';
        this.brushSize = 5;
        this.isDrawing = false;
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Create pixel grid (4x4 pixel size for better performance on mobile)
        this.pixelSize = 4;
        this.pixelGrid = new PixelGrid(width, height, this.pixelSize);

        // Create graphics object for rendering
        this.graphics = this.add.graphics();

        // Create render texture for better performance
        this.renderTexture = this.add.renderTexture(0, 0, width, height);

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
        const stoneElement = ElementRegistry.get('stone');

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
            ? ElementRegistry.get('empty')
            : ElementRegistry.get(this.selectedElement);

        if (!element) return;

        // Draw in a circle around the cursor
        for (let dy = -this.brushSize; dy <= this.brushSize; dy++) {
            for (let dx = -this.brushSize; dx <= this.brushSize; dx++) {
                if (dx * dx + dy * dy <= this.brushSize * this.brushSize) {
                    this.pixelGrid.setElement(gridX + dx, gridY + dy, element);
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
