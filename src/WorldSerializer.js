// WorldSerializer - Save, load, and share worlds via base64 encoding
export default class WorldSerializer {
    constructor(gameScene) {
        this.gameScene = gameScene;
    }

    /**
     * Serialize the current world to a base64 string
     * Format: width,height|elementId,elementId,elementId...
     */
    serializeWorld() {
        const grid = this.gameScene.pixelGrid;
        const width = grid.width;
        const height = grid.height;

        // Build array of element IDs
        const elements = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const element = grid.getElement(x, y);
                elements.push(element ? element.id : 0);
            }
        }

        // Create compact string: dimensions + element IDs
        const dataString = `${width},${height}|${elements.join(',')}`;

        // Encode to base64
        const base64 = btoa(dataString);

        console.log(`🌍 World serialized: ${width}x${height} (${base64.length} chars)`);
        return base64;
    }

    /**
     * Deserialize a base64 world string and load it
     */
    deserializeWorld(base64String) {
        try {
            // Decode from base64
            const dataString = atob(base64String);

            // Parse dimensions and element data
            const [dimensionsStr, elementsStr] = dataString.split('|');
            const [width, height] = dimensionsStr.split(',').map(Number);
            const elementIds = elementsStr.split(',').map(Number);

            // Validate dimensions
            const grid = this.gameScene.pixelGrid;
            if (width !== grid.width || height !== grid.height) {
                throw new Error(`Dimension mismatch: Expected ${grid.width}x${grid.height}, got ${width}x${height}`);
            }

            // Validate data length
            if (elementIds.length !== width * height) {
                throw new Error(`Data length mismatch: Expected ${width * height}, got ${elementIds.length}`);
            }

            // Clear grid completely (don't use resetWorld - it adds borders!)
            const empty = this.gameScene.elementRegistry.get('empty');
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    grid.setElement(x, y, empty);
                }
            }

            // Reset to build mode
            this.gameScene.buildMode = true;
            this.gameScene.updateModeDisplay();

            // Despawn player
            this.gameScene.playerX = null;
            this.gameScene.playerY = null;

            // Load elements from serialized data
            let index = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const elementId = elementIds[index++];
                    if (elementId !== 0) {
                        const element = this.gameScene.elementRegistry.getById(elementId);
                        if (element) {
                            grid.setElement(x, y, element);
                        } else {
                            console.warn(`⚠️ Unknown element ID: ${elementId} at (${x}, ${y})`);
                        }
                    }
                }
            }

            // Count loaded elements for debugging
            const elementCounts = {};
            elementIds.forEach(id => {
                if (id !== 0) {
                    const element = this.gameScene.elementRegistry.getById(id);
                    const name = element ? element.name : `unknown(${id})`;
                    elementCounts[name] = (elementCounts[name] || 0) + 1;
                }
            });

            console.log(`🌍 World loaded from code: ${width}x${height}`);
            console.log('📊 Element breakdown:', elementCounts);
            return true;

        } catch (error) {
            console.error('❌ Failed to load world:', error.message);
            alert(`Failed to load world: ${error.message}`);
            return false;
        }
    }

    /**
     * Copy world code to clipboard
     */
    async copyToClipboard() {
        const worldCode = this.serializeWorld();

        try {
            await navigator.clipboard.writeText(worldCode);
            console.log('📋 World code copied to clipboard');
            return worldCode;
        } catch (error) {
            console.error('❌ Failed to copy to clipboard:', error);
            // Fallback: show in alert
            prompt('Copy this world code:', worldCode);
            return worldCode;
        }
    }

    /**
     * Show import dialog
     */
    showImportDialog() {
        const worldCode = prompt('Paste world code to load:');
        if (worldCode && worldCode.trim()) {
            return this.deserializeWorld(worldCode.trim());
        }
        return false;
    }
}
