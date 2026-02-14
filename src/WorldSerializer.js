// WorldSerializer - Save, load, and share worlds via base64 encoding
import { VERSION } from '../version.js';

// Serialization format version - bump when format changes
const SAVE_FORMAT_VERSION = 3;

// Cell data keys to skip when serializing (transient/computed each frame)
const SKIP_DATA_KEYS = new Set([
    'cachedDepth', 'cachedDepthFrame', 'cachedSurfaceY', 'cachedFoodLocation',
    'cachedNearbyFishCount', 'cachedNearbyBirdCount', 'cachedTreeLocation',
    'cacheFrame', 'isLavaSurface', 'velocityX', 'velocityY',
    'ignitionCheckFrame', 'updated'
]);

export default class WorldSerializer {
    constructor(gameScene) {
        this.gameScene = gameScene;
    }

    /**
     * Serialize the current world state.
     * Format v3: JSON with grid elements, sparse cell data, full game state.
     */
    serializeWorld() {
        const grid = this.gameScene.pixelGrid;
        const width = grid.width;
        const height = grid.height;

        // Build element ID array and sparse cell data map
        const elements = [];
        const cellData = {};

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = grid.getCell(x, y);
                const elementId = cell ? cell.element.id : 0;
                elements.push(elementId);

                // Save cell.data for non-empty cells that have meaningful data
                if (elementId !== 0 && cell.data) {
                    const filtered = this._filterCellData(cell.data);
                    if (filtered) {
                        const key = y * width + x;
                        cellData[key] = filtered;
                    }
                }
            }
        }

        const saveData = {
            formatVersion: SAVE_FORMAT_VERSION,
            gameVersion: VERSION,
            timestamp: Date.now(),
            grid: {
                width,
                height,
                elements: elements.join(','),
                cellData // sparse: only cells with meaningful data
            },
            gameState: {
                buildMode: this.gameScene.buildMode,
                dayTime: this.gameScene.dayNightCycle?.time || 0.35,
                currentDay: this.gameScene.currentDay || 0,
                timeSpeedIndex: this.gameScene.timeControl?.currentSpeedIndex || 3,
                biome: this.gameScene.backgroundGenerator?.biome || 'mountains',
                season: this.gameScene.seasonManager?.currentSeason,
                seasonTime: this.gameScene.seasonManager?.seasonTime || 0,
                weatherCloudiness: this.gameScene.weatherSystem?.cloudiness || 0,
            },
            player: {
                x: this.gameScene.playerX,
                y: this.gameScene.playerY
            }
        };

        const json = JSON.stringify(saveData);
        return btoa(json);
    }

    /**
     * Filter cell data to exclude transient/cached keys.
     * Returns null if no meaningful data remains.
     * @private
     */
    _filterCellData(data) {
        const result = {};
        let hasData = false;

        for (const key in data) {
            if (SKIP_DATA_KEYS.has(key)) continue;
            const val = data[key];
            // Skip undefined, functions, and null
            if (val === undefined || val === null || typeof val === 'function') continue;
            result[key] = val;
            hasData = true;
        }

        return hasData ? result : null;
    }

    /**
     * Deserialize a base64 world string and load it.
     * Supports v3, v2, and v1 (legacy) formats.
     */
    deserializeWorld(base64String) {
        try {
            const dataString = atob(base64String);

            let saveData;
            if (dataString.startsWith('{')) {
                saveData = JSON.parse(dataString);
            } else {
                // v1 legacy format
                saveData = this._parseLegacyFormat(dataString);
            }

            return this._loadSaveData(saveData);

        } catch (error) {
            console.error('Failed to load world:', error.message);
            return false;
        }
    }

    /**
     * Parse legacy v1 format into v2-compatible structure
     * @private
     */
    _parseLegacyFormat(dataString) {
        const [dimensionsStr, elementsStr] = dataString.split('|');
        const [width, height] = dimensionsStr.split(',').map(Number);

        return {
            formatVersion: 1,
            grid: { width, height, elements: elementsStr },
            gameState: {
                buildMode: true,
                dayTime: 0.35,
                currentDay: 0,
                timeSpeedIndex: 3
            }
        };
    }

    /**
     * Load save data into the game (supports v1, v2, v3)
     * @private
     */
    _loadSaveData(saveData) {
        const grid = this.gameScene.pixelGrid;
        const { width, height, elements } = saveData.grid;
        const elementIds = elements.split(',').map(Number);
        const cellDataMap = saveData.grid.cellData || {}; // v3 only

        // Validate dimensions
        if (width !== grid.width || height !== grid.height) {
            throw new Error(`Dimension mismatch: Expected ${grid.width}x${grid.height}, got ${width}x${height}`);
        }

        if (elementIds.length !== width * height) {
            throw new Error(`Data length mismatch: Expected ${width * height}, got ${elementIds.length}`);
        }

        // Clear grid completely
        const empty = this.gameScene.elementRegistry.get('empty');
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                grid.setElement(x, y, empty);
            }
        }

        // Restore game state
        const gameState = saveData.gameState || {};

        this.gameScene.buildMode = gameState.buildMode !== false;
        if (this.gameScene.updateModeDisplay) {
            this.gameScene.updateModeDisplay();
        }

        if (this.gameScene.dayNightCycle && gameState.dayTime !== undefined) {
            this.gameScene.dayNightCycle.time = gameState.dayTime;
        }
        if (gameState.currentDay !== undefined) {
            this.gameScene.currentDay = gameState.currentDay;
        }
        if (this.gameScene.timeControl && gameState.timeSpeedIndex !== undefined) {
            this.gameScene.timeControl.currentSpeedIndex = gameState.timeSpeedIndex;
        }

        // v3: Restore biome
        if (gameState.biome && this.gameScene.backgroundGenerator) {
            this.gameScene.backgroundGenerator.setBiome(gameState.biome);
            // Sync biome select dropdown
            const biomeSelect = document.getElementById('biome-select');
            if (biomeSelect) biomeSelect.value = gameState.biome;
        }

        // v3: Restore season state
        if (gameState.season && this.gameScene.seasonManager) {
            this.gameScene.seasonManager.currentSeason = gameState.season;
            this.gameScene.seasonManager.seasonTime = gameState.seasonTime || 0;
            this.gameScene.seasonManager.seasonProgress =
                this.gameScene.seasonManager.seasonTime / this.gameScene.seasonManager.seasonLength;
        }

        // v3: Restore weather
        if (gameState.weatherCloudiness !== undefined && this.gameScene.weatherSystem) {
            this.gameScene.weatherSystem.cloudiness = gameState.weatherCloudiness;
        }

        // Restore player position
        const playerData = saveData.player;
        if (playerData && playerData.x != null && playerData.y != null) {
            this.gameScene.playerX = playerData.x;
            this.gameScene.playerY = playerData.y;
        } else {
            this.gameScene.playerX = null;
            this.gameScene.playerY = null;
        }

        // Load elements and cell data
        let index = 0;
        let loadedCount = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const elementId = elementIds[index];
                if (elementId !== 0) {
                    const element = this.gameScene.elementRegistry.getById(elementId);
                    if (element) {
                        grid.setElement(x, y, element);
                        loadedCount++;

                        // v3: Restore cell data
                        const key = String(index);
                        if (cellDataMap[key]) {
                            const cell = grid.getCell(x, y);
                            if (cell) {
                                Object.assign(cell.data, cellDataMap[key]);
                            }
                        }
                    } else {
                        console.warn(`Unknown element ID: ${elementId} at (${x}, ${y})`);
                    }
                }
                index++;
            }
        }

        console.log(`Loaded world: ${loadedCount} elements, format v${saveData.formatVersion || 1}`);
        return true;
    }

    /**
     * Capture a thumbnail of the current canvas as a small data URL.
     * @param {number} maxWidth - Thumbnail width (default 160)
     * @param {number} maxHeight - Thumbnail height (default 120)
     * @returns {string|null} Base64 data URL or null
     */
    captureThumbnail(maxWidth = 160, maxHeight = 120) {
        try {
            const canvas = document.querySelector('#game-container canvas');
            if (!canvas) return null;

            const thumb = document.createElement('canvas');
            thumb.width = maxWidth;
            thumb.height = maxHeight;
            const ctx = thumb.getContext('2d');
            ctx.drawImage(canvas, 0, 0, maxWidth, maxHeight);
            return thumb.toDataURL('image/png', 0.7);
        } catch (e) {
            console.warn('Thumbnail capture failed:', e);
            return null;
        }
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
            console.error('Failed to copy to clipboard:', error);
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
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15);
            const filename = `pixelbox-${timestamp}.json`;

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
            const formData = new FormData();
            formData.append('file', new Blob([json], { type: 'application/json' }), filename);

            const response = await fetch('https://0x0.st/', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
            }

            return (await response.text()).trim();

        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    /**
     * Download world from 0x0.st URL
     */
    async downloadWorld(url) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);

            const state = await response.json();
            if (!state.world) throw new Error('Invalid save file: missing world data');

            return this.deserializeWorld(state.world);

        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    /**
     * Show export dialog with 0x0.st upload
     */
    async showExportDialog() {
        try {
            const url = await this.uploadWorld();
            try {
                await navigator.clipboard.writeText(url);
            } catch (e) {
                console.warn('Could not copy to clipboard');
            }
            alert(`World uploaded!\n\nURL: ${url}\n\nBookmark this URL to load later.`);
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
        if (!url || !url.trim()) return false;

        try {
            const success = await this.downloadWorld(url.trim());
            if (success) alert('World loaded successfully!');
            return success;
        } catch (error) {
            alert(`Failed to load world: ${error.message}`);
            return false;
        }
    }

    /**
     * Auto-save current world to local storage.
     * Called periodically and when navigating to menu.
     */
    async autoSave() {
        try {
            const worldData = this.serializeWorld();
            const { default: storageManager } = await import('./StorageManager.js');
            const success = await storageManager.saveCurrentWorld(worldData);
            if (success) {
                console.log('World auto-saved');
            }
            return success;
        } catch (error) {
            console.error('Auto-save failed:', error);
            return false;
        }
    }

    /**
     * Save current world to a named slot with thumbnail.
     * @param {string} name - World name
     * @returns {Promise<boolean>}
     */
    async saveToSlot(name) {
        try {
            const worldData = this.serializeWorld();
            const thumbnail = this.captureThumbnail();
            const { default: storageManager } = await import('./StorageManager.js');
            return await storageManager.saveWorld(name, worldData, thumbnail);
        } catch (error) {
            console.error('Save to slot failed:', error);
            return false;
        }
    }

    /**
     * Load a world from a named slot.
     * @param {string} name - World name
     * @returns {Promise<boolean>}
     */
    async loadFromSlot(name) {
        try {
            const { default: storageManager } = await import('./StorageManager.js');
            const worldData = await storageManager.loadWorld(name);
            if (worldData) {
                return this.deserializeWorld(worldData);
            }
            return false;
        } catch (error) {
            console.error('Load from slot failed:', error);
            return false;
        }
    }
}
