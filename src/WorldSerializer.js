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

            console.log(`☁️ Uploading world to 0x0.st... (${json.length} bytes)`);

            // Upload to 0x0.st
            const response = await fetch('https://0x0.st/', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
            }

            const url = (await response.text()).trim();
            console.log(`✅ World uploaded: ${url}`);

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
            console.log(`☁️ Downloading world from ${url}...`);

            const response = await fetch(url, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const state = await response.json();

            // Validate state structure
            if (!state.world) {
                throw new Error('Invalid save file: missing world data');
            }

            console.log(`✅ World downloaded (v${state.version || 'unknown'})`);

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
}
