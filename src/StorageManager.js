/**
 * StorageManager.js - Local world persistence using Capacitor Preferences
 * Replaces clipboard-based world sharing with native storage
 */

import { Preferences } from '@capacitor/preferences';

class StorageManager {
    constructor() {
        this.WORLD_PREFIX = 'pixelbox_world_';
        this.WORLD_LIST_KEY = 'pixelbox_worlds_list';
        this.CURRENT_WORLD_KEY = 'pixelbox_current_world';
        this.AUTO_SAVE_INTERVAL = 30000; // 30 seconds
        this.autoSaveTimer = null;
    }

    /**
     * Initialize storage and start auto-save
     */
    async init() {
        console.log('📦 StorageManager initialized');
        // Load list of saved worlds
        return await this.getWorldList();
    }

    /**
     * Save a world to local storage
     * @param {string} name - World name
     * @param {object} worldData - Serialized world data
     * @returns {Promise<boolean>} Success status
     */
    async saveWorld(name, worldData) {
        try {
            const worldKey = this.WORLD_PREFIX + name;
            const timestamp = Date.now();

            const worldEntry = {
                name,
                data: worldData,
                timestamp,
                version: '3.17.1' // Track which version created this save
            };

            // Save world data
            await Preferences.set({
                key: worldKey,
                value: JSON.stringify(worldEntry)
            });

            // Update world list
            const worlds = await this.getWorldList();
            if (!worlds.find(w => w.name === name)) {
                worlds.push({ name, timestamp });
                await this._saveWorldList(worlds);
            } else {
                // Update timestamp for existing world
                const world = worlds.find(w => w.name === name);
                world.timestamp = timestamp;
                await this._saveWorldList(worlds);
            }

            console.log(`💾 World "${name}" saved successfully`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save world:', error);
            return false;
        }
    }

    /**
     * Load a world from local storage
     * @param {string} name - World name
     * @returns {Promise<object|null>} World data or null if not found
     */
    async loadWorld(name) {
        try {
            const worldKey = this.WORLD_PREFIX + name;
            const result = await Preferences.get({ key: worldKey });

            if (result.value) {
                const worldEntry = JSON.parse(result.value);
                console.log(`📂 World "${name}" loaded successfully`);
                return worldEntry.data;
            } else {
                console.warn(`⚠️ World "${name}" not found`);
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to load world:', error);
            return null;
        }
    }

    /**
     * Delete a world from local storage
     * @param {string} name - World name
     * @returns {Promise<boolean>} Success status
     */
    async deleteWorld(name) {
        try {
            const worldKey = this.WORLD_PREFIX + name;

            // Remove world data
            await Preferences.remove({ key: worldKey });

            // Update world list
            const worlds = await this.getWorldList();
            const filtered = worlds.filter(w => w.name !== name);
            await this._saveWorldList(filtered);

            console.log(`🗑️ World "${name}" deleted successfully`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete world:', error);
            return false;
        }
    }

    /**
     * Get list of all saved worlds
     * @returns {Promise<Array>} Array of world metadata {name, timestamp}
     */
    async getWorldList() {
        try {
            const result = await Preferences.get({ key: this.WORLD_LIST_KEY });

            if (result.value) {
                const worlds = JSON.parse(result.value);
                // Sort by timestamp (newest first)
                return worlds.sort((a, b) => b.timestamp - a.timestamp);
            }

            return [];
        } catch (error) {
            console.error('❌ Failed to get world list:', error);
            return [];
        }
    }

    /**
     * Save the world list to storage
     * @private
     */
    async _saveWorldList(worlds) {
        await Preferences.set({
            key: this.WORLD_LIST_KEY,
            value: JSON.stringify(worlds)
        });
    }

    /**
     * Save current world state (for auto-save)
     * @param {object} worldData - Current world state
     */
    async saveCurrentWorld(worldData) {
        try {
            await Preferences.set({
                key: this.CURRENT_WORLD_KEY,
                value: JSON.stringify({
                    data: worldData,
                    timestamp: Date.now()
                })
            });
            console.log('💾 Auto-saved current world');
            return true;
        } catch (error) {
            console.error('❌ Failed to auto-save:', error);
            return false;
        }
    }

    /**
     * Load the last auto-saved world state
     * @returns {Promise<object|null>} World data or null
     */
    async loadCurrentWorld() {
        try {
            const result = await Preferences.get({ key: this.CURRENT_WORLD_KEY });

            if (result.value) {
                const saved = JSON.parse(result.value);
                console.log('📂 Loaded auto-saved world');
                return saved.data;
            }

            return null;
        } catch (error) {
            console.error('❌ Failed to load auto-save:', error);
            return null;
        }
    }

    /**
     * Start auto-save timer
     * @param {Function} getWorldDataFn - Function that returns current world data
     */
    startAutoSave(getWorldDataFn) {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(async () => {
            const worldData = getWorldDataFn();
            if (worldData) {
                await this.saveCurrentWorld(worldData);
            }
        }, this.AUTO_SAVE_INTERVAL);

        console.log(`⏰ Auto-save enabled (every ${this.AUTO_SAVE_INTERVAL / 1000}s)`);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('⏰ Auto-save disabled');
        }
    }

    /**
     * Clear all saved worlds (use with caution!)
     * @returns {Promise<boolean>} Success status
     */
    async clearAllWorlds() {
        try {
            const worlds = await this.getWorldList();

            // Delete each world
            for (const world of worlds) {
                await Preferences.remove({ key: this.WORLD_PREFIX + world.name });
            }

            // Clear world list
            await Preferences.remove({ key: this.WORLD_LIST_KEY });

            // Clear current world
            await Preferences.remove({ key: this.CURRENT_WORLD_KEY });

            console.log('🗑️ All worlds cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear worlds:', error);
            return false;
        }
    }
}

// Export singleton instance
const storageManager = new StorageManager();
export default storageManager;
