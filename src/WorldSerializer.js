// WorldSerializer - Save, load, and share worlds via base64 encoding
import { VERSION } from '../version.js';

// Serialization format version - bump when format changes
const SAVE_FORMAT_VERSION = 2;

export default class WorldSerializer {
    constructor(gameScene) {
        this.gameScene = gameScene;
    }

    /**
     * Serialize the current world to a base64 string
     * Format v2: JSON with version, game state, and grid data
     * Format v1 (legacy): width,height|elementId,elementId,elementId...
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

        // Create save object with metadata
        const saveData = {
            formatVersion: SAVE_FORMAT_VERSION,
            gameVersion: VERSION,
            timestamp: Date.now(),
            grid: {
                width,
                height,
                elements: elements.join(',')
            },
            gameState: {
                buildMode: this.gameScene.buildMode,
                dayTime: this.gameScene.dayNightCycle?.time || 0.35,
                currentDay: this.gameScene.currentDay || 0,
                timeSpeedIndex: this.gameScene.timeControl?.currentSpeedIndex || 3
            },
            player: {
                x: this.gameScene.playerX,
                y: this.gameScene.playerY
            }
        };

        // Encode to base64
        const json = JSON.stringify(saveData);
        const base64 = btoa(json);

        return base64;
    }

    /**
     * Deserialize a base64 world string and load it
     * Supports both v2 (JSON) and v1 (legacy) formats
     */
    deserializeWorld(base64String) {
        try {
            // Decode from base64
            const dataString = atob(base64String);

            // Detect format: v2 starts with '{' (JSON), v1 starts with dimensions
            let saveData;
            if (dataString.startsWith('{')) {
                // v2 format: JSON
                saveData = JSON.parse(dataString);
            } else {
                // v1 legacy format: width,height|elementId,elementId,...
                saveData = this._parseLegacyFormat(dataString);
            }

            return this._loadSaveData(saveData);

        } catch (error) {
            console.error('❌ Failed to load world:', error.message);
            // Don't show alert for auto-load failures, only for manual imports
            return false;
        }
    }

    /**
     * Parse legacy v1 format into v2 structure
     * @private
     */
    _parseLegacyFormat(dataString) {
        const [dimensionsStr, elementsStr] = dataString.split('|');
        const [width, height] = dimensionsStr.split(',').map(Number);

        return {
            formatVersion: 1,
            grid: {
                width,
                height,
                elements: elementsStr
            },
            gameState: {
                buildMode: true,
                dayTime: 0.35,
                currentDay: 0,
                timeSpeedIndex: 3
            }
        };
    }

    /**
     * Load save data into the game
     * @private
     */
    _loadSaveData(saveData) {
        const grid = this.gameScene.pixelGrid;
        const { width, height, elements } = saveData.grid;
        const elementIds = elements.split(',').map(Number);

        // Validate dimensions
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

        // Restore game state
        const gameState = saveData.gameState || {};

        this.gameScene.buildMode = gameState.buildMode !== false; // Default to true
        if (this.gameScene.updateModeDisplay) {
            this.gameScene.updateModeDisplay();
        }

        // Restore day/night cycle if available
        if (this.gameScene.dayNightCycle && gameState.dayTime !== undefined) {
            this.gameScene.dayNightCycle.time = gameState.dayTime;
        }
        if (gameState.currentDay !== undefined) {
            this.gameScene.currentDay = gameState.currentDay;
        }

        // Restore time speed
        if (this.gameScene.timeControl && gameState.timeSpeedIndex !== undefined) {
            this.gameScene.timeControl.currentSpeedIndex = gameState.timeSpeedIndex;
        }

        // Restore player position if saved, otherwise despawn
        const playerData = saveData.player;
        if (playerData && playerData.x !== null && playerData.y !== null) {
            this.gameScene.playerX = playerData.x;
            this.gameScene.playerY = playerData.y;
        } else {
            this.gameScene.playerX = null;
            this.gameScene.playerY = null;
        }

        // Load elements from serialized data
        let index = 0;
        let loadedCount = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const elementId = elementIds[index++];
                if (elementId !== 0) {
                    const element = this.gameScene.elementRegistry.getById(elementId);
                    if (element) {
                        grid.setElement(x, y, element);
                        loadedCount++;
                    } else {
                        console.warn(`⚠️ Unknown element ID: ${elementId} at (${x}, ${y})`);
                    }
                }
            }
        }

        console.log(`📂 Loaded world: ${loadedCount} elements, format v${saveData.formatVersion || 1}`);
        return true;
    }

    /**
     * Copy world code to clipboard
     */
    async copyToClipboard() {
        const worldCode = this.serializeWorld();

        try {
            await navigator.clipboard.writeText(worldCode);
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

    /**
     * Upload world to 0x0.st and return public URL
     */
    async uploadWorld() {
        try {
            const worldCode = this.serializeWorld();

            // Create timestamp for filename
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15); // yyyyMMddTHHmmss
            const filename = `pixelbox-${timestamp}.json`;

            // Prepare JSON payload
            const state = {
                version: '1.0',
                timestamp: now.toISOString(),
                world: worldCode,
                dimensions: {
                    width: this.gameScene.pixelGrid.width,
                    height: this.gameScene.pixelGrid.height
                }
            };

            const json = JSON.stringify(state);

            // Create FormData for upload
            const formData = new FormData();
            formData.append('file', new Blob([json], { type: 'application/json' }), filename);

            // Upload to 0x0.st
            const response = await fetch('https://0x0.st/', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
            }

            const url = (await response.text()).trim();

            return url;

        } catch (error) {
            console.error('❌ Upload failed:', error);
            throw error;
        }
    }

    /**
     * Download world from 0x0.st URL
     */
    async downloadWorld(url) {
        try {
            const response = await fetch(url, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const state = await response.json();

            // Validate state structure
            if (!state.world) {
                throw new Error('Invalid save file: missing world data');
            }

            // Load the world
            return this.deserializeWorld(state.world);

        } catch (error) {
            console.error('❌ Download failed:', error);
            throw error;
        }
    }

    /**
     * Show export dialog with 0x0.st upload
     */
    async showExportDialog() {
        try {
            const url = await this.uploadWorld();

            // Show success message with URL
            const message = `World uploaded successfully!\n\nURL: ${url}\n\n✅ Bookmark this URL to load your world later.\n📋 URL has been copied to clipboard.`;

            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(url);
            } catch (e) {
                console.warn('Could not copy to clipboard');
            }

            alert(message);
            return url;

        } catch (error) {
            alert(`Failed to upload world: ${error.message}`);
            return null;
        }
    }

    /**
     * Show import dialog with 0x0.st download
     */
    async showDownloadDialog() {
        const url = prompt('Enter 0x0.st URL to load world:');

        if (!url || !url.trim()) {
            return false;
        }

        try {
            const success = await this.downloadWorld(url.trim());
            if (success) {
                alert('World loaded successfully!');
            }
            return success;

        } catch (error) {
            alert(`Failed to load world: ${error.message}`);
            return false;
        }
    }

    /**
     * Auto-save current world to local storage
     * Called when navigating to menu or periodically
     * @returns {Promise<boolean>} Success status
     */
    async autoSave() {
        try {
            const worldData = this.serializeWorld();
            const { default: storageManager } = await import('./StorageManager.js');
            const success = await storageManager.saveCurrentWorld(worldData);
            if (success) {
                console.log('💾 World auto-saved');
            }
            return success;
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            return false;
        }
    }
}
