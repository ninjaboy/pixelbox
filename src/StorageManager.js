/**
 * StorageManager.js - Local world persistence using Capacitor Preferences
 * Supports multiple named save slots with thumbnails and metadata.
 */

import { Preferences } from '@capacitor/preferences';

class StorageManager {
    constructor() {
        this.WORLD_PREFIX = 'pixelbox_world_';
        this.WORLD_LIST_KEY = 'pixelbox_worlds_list';
        this.CURRENT_WORLD_KEY = 'pixelbox_current_world';
        this.MAX_SLOTS = 20;
        this.lastError = null; // 'quota' | 'unknown' | null
    }

    /**
     * Initialize storage
     */
    async init() {
        console.log('StorageManager initialized');
        return await this.getWorldList();
    }

    /**
     * Wrapper for Preferences.set that detects quota errors.
     * @private
     * @returns {Promise<boolean>} true if successful
     */
    async _safeSet(key, value) {
        try {
            await Preferences.set({ key, value });
            return true;
        } catch (error) {
            const msg = (error?.message || error?.name || '').toLowerCase();
            if (msg.includes('quota') || msg.includes('storage')
                || error?.name === 'QuotaExceededError'
                || error?.code === 22) {
                this.lastError = 'quota';
            } else {
                this.lastError = 'unknown';
            }
            throw error;
        }
    }

    /**
     * Save a world to a named slot with optional thumbnail.
     * Thumbnail is stored only in the world list (not duplicated in world data).
     * @param {string} name - World name
     * @param {string} worldData - Serialized world data (base64)
     * @param {string|null} thumbnail - Base64 data URL for thumbnail
     * @returns {Promise<boolean>}
     */
    async saveWorld(name, worldData, thumbnail = null) {
        this.lastError = null;
        try {
            const worldKey = this.WORLD_PREFIX + name;
            const timestamp = Date.now();

            // Store world data without thumbnail (thumbnail lives in world list only)
            const worldEntry = {
                name,
                data: worldData,
                timestamp,
            };

            await this._safeSet(worldKey, JSON.stringify(worldEntry));

            // Update world list (includes thumbnail for display)
            const worlds = await this.getWorldList();
            const existing = worlds.find(w => w.name === name);
            if (existing) {
                existing.timestamp = timestamp;
                existing.thumbnail = thumbnail;
            } else {
                worlds.push({ name, timestamp, thumbnail });
            }
            await this._saveWorldList(worlds);

            console.log(`World "${name}" saved`);
            return true;
        } catch (error) {
            console.error('Failed to save world:', error);
            return false;
        }
    }

    /**
     * Load a world from a named slot.
     * @param {string} name - World name
     * @returns {Promise<string|null>} Base64 world data or null
     */
    async loadWorld(name) {
        try {
            const worldKey = this.WORLD_PREFIX + name;
            const result = await Preferences.get({ key: worldKey });

            if (result.value) {
                const worldEntry = JSON.parse(result.value);
                return worldEntry.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to load world:', error);
            return null;
        }
    }

    /**
     * Delete a world from storage.
     * Updates list first to maintain consistency (list is source of truth).
     * @param {string} name - World name
     * @returns {Promise<boolean>}
     */
    async deleteWorld(name) {
        try {
            // Update list first — if this fails, the data is still accessible
            const worlds = await this.getWorldList();
            const filtered = worlds.filter(w => w.name !== name);
            await this._saveWorldList(filtered);

            // Then remove the data
            const worldKey = this.WORLD_PREFIX + name;
            await Preferences.remove({ key: worldKey });

            console.log(`World "${name}" deleted`);
            return true;
        } catch (error) {
            console.error('Failed to delete world:', error);
            return false;
        }
    }

    /**
     * Get list of all saved worlds (sorted by timestamp, newest first).
     * @returns {Promise<Array<{name: string, timestamp: number, thumbnail: string|null}>>}
     */
    async getWorldList() {
        try {
            const result = await Preferences.get({ key: this.WORLD_LIST_KEY });
            if (result.value) {
                const worlds = JSON.parse(result.value);
                return worlds.sort((a, b) => b.timestamp - a.timestamp);
            }
            return [];
        } catch (error) {
            console.error('Failed to get world list:', error);
            return [];
        }
    }

    /**
     * @private
     */
    async _saveWorldList(worlds) {
        await this._safeSet(this.WORLD_LIST_KEY, JSON.stringify(worlds));
    }

    /**
     * Save current world state for auto-save / continue.
     * @param {string|null} worldData - Base64 world data, or null to clear
     * @returns {Promise<boolean>}
     */
    async saveCurrentWorld(worldData) {
        this.lastError = null;
        try {
            if (worldData === null) {
                await Preferences.remove({ key: this.CURRENT_WORLD_KEY });
                return true;
            }
            await this._safeSet(this.CURRENT_WORLD_KEY, JSON.stringify({
                data: worldData,
                timestamp: Date.now()
            }));
            return true;
        } catch (error) {
            console.error('Failed to auto-save:', error);
            return false;
        }
    }

    /**
     * Load the last auto-saved world state.
     * @returns {Promise<string|null>} Base64 world data or null
     */
    async loadCurrentWorld() {
        try {
            const result = await Preferences.get({ key: this.CURRENT_WORLD_KEY });
            if (result.value) {
                const saved = JSON.parse(result.value);
                return saved.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to load auto-save:', error);
            return null;
        }
    }

    /**
     * Check if max save slots are reached.
     * @returns {Promise<boolean>}
     */
    async isFull() {
        const worlds = await this.getWorldList();
        return worlds.length >= this.MAX_SLOTS;
    }

    /**
     * Clear all saved worlds.
     * @returns {Promise<boolean>}
     */
    async clearAllWorlds() {
        try {
            const worlds = await this.getWorldList();
            for (const world of worlds) {
                await Preferences.remove({ key: this.WORLD_PREFIX + world.name });
            }
            await Preferences.remove({ key: this.WORLD_LIST_KEY });
            await Preferences.remove({ key: this.CURRENT_WORLD_KEY });
            return true;
        } catch (error) {
            console.error('Failed to clear worlds:', error);
            return false;
        }
    }
}

const storageManager = new StorageManager();
export default storageManager;
