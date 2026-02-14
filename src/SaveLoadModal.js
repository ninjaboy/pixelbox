/**
 * SaveLoadModal.js - Save/Load worlds modal UI
 *
 * Full-screen modal for managing world saves: create new saves,
 * load existing saves, delete saves. Shows thumbnails and metadata.
 */

import storageManager from './StorageManager.js';

class SaveLoadModal {
    constructor() {
        this.overlay = null;
        this._built = false;
        this._busy = false;
        this._gameScene = null;
        this._onLoadCallback = null;
    }

    /**
     * Build the modal DOM elements (once).
     * @private
     */
    _build() {
        if (this._built) return;

        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'saveload-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 20000;
            animation: fadeIn 0.25s ease;
        `;

        // Modal container
        const modal = document.createElement('div');
        modal.id = 'saveload-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
            border: 2px solid rgba(0, 204, 204, 0.5);
            border-radius: 4px;
            padding: 20px;
            max-width: 400px;
            width: 90%;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 0 24px rgba(0, 204, 204, 0.15), inset 0 0 12px rgba(0, 0, 0, 0.4);
            animation: slideUp 0.25s ease;
            font-family: 'Courier New', monospace;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(0, 204, 204, 0.3);
        `;

        const title = document.createElement('h3');
        title.textContent = 'WORLDS';
        title.style.cssText = `
            margin: 0;
            color: rgba(0, 204, 204, 0.9);
            font-size: 14px;
            letter-spacing: 2px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(0, 204, 204, 0.4);
            width: 24px; height: 24px;
            color: rgba(0, 204, 204, 0.8);
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        `;
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Save current button
        const saveRow = document.createElement('div');
        saveRow.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
        `;

        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.placeholder = 'World name...';
        this.nameInput.maxLength = 24;
        this.nameInput.style.cssText = `
            flex: 1;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(0, 204, 204, 0.3);
            color: rgba(255, 255, 255, 0.9);
            padding: 8px 10px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            outline: none;
        `;
        this.nameInput.addEventListener('focus', () => {
            this.nameInput.style.borderColor = 'rgba(0, 204, 204, 0.6)';
        });
        this.nameInput.addEventListener('blur', () => {
            this.nameInput.style.borderColor = 'rgba(0, 204, 204, 0.3)';
        });

        this.saveBtn = document.createElement('button');
        this.saveBtn.textContent = 'SAVE';
        this.saveBtn.style.cssText = `
            background: rgba(0, 204, 204, 0.15);
            border: 1px solid rgba(0, 204, 204, 0.5);
            color: rgba(0, 204, 204, 0.9);
            padding: 8px 16px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            letter-spacing: 1px;
            transition: all 0.15s;
        `;
        this.saveBtn.addEventListener('click', () => this._handleSave());

        saveRow.appendChild(this.nameInput);
        saveRow.appendChild(this.saveBtn);

        // Slot count
        this.slotCount = document.createElement('div');
        this.slotCount.style.cssText = `
            font-size: 10px;
            color: rgba(255, 255, 255, 0.35);
            margin-bottom: 8px;
            text-align: right;
        `;

        // Scrollable world list
        this.worldList = document.createElement('div');
        this.worldList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            min-height: 100px;
            max-height: 50vh;
        `;

        // Empty state
        this.emptyState = document.createElement('div');
        this.emptyState.style.cssText = `
            text-align: center;
            color: rgba(255, 255, 255, 0.3);
            font-size: 12px;
            padding: 30px 0;
        `;
        this.emptyState.textContent = 'No saved worlds yet';

        modal.appendChild(header);
        modal.appendChild(saveRow);
        modal.appendChild(this.slotCount);
        modal.appendChild(this.worldList);
        this.overlay.appendChild(modal);

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        // Close on Escape
        this._escHandler = (e) => {
            if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide();
            }
        };
        document.addEventListener('keydown', this._escHandler);

        document.body.appendChild(this.overlay);
        this._built = true;
    }

    /**
     * Show the save/load modal.
     * @param {object} gameScene - The GameScene instance
     * @param {Function} onLoadCallback - Called after a world is loaded
     */
    async show(gameScene, onLoadCallback) {
        this._build();
        this._gameScene = gameScene;
        this._onLoadCallback = onLoadCallback;

        // Default name suggestion
        const now = new Date();
        const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.nameInput.value = `World ${dateStr}`;

        await this._refreshList();
        this.overlay.style.display = 'flex';
    }

    /**
     * Hide the modal.
     */
    hide() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        // Refocus canvas for touch input
        setTimeout(() => {
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.focus();
        }, 100);
    }

    /**
     * Refresh the world list display.
     * @private
     */
    async _refreshList() {
        const worlds = await storageManager.getWorldList();

        this.slotCount.textContent = `${worlds.length} / ${storageManager.MAX_SLOTS} slots`;

        this.worldList.innerHTML = '';

        if (worlds.length === 0) {
            this.worldList.appendChild(this.emptyState);
            return;
        }

        for (const world of worlds) {
            const row = this._createWorldRow(world);
            this.worldList.appendChild(row);
        }
    }

    /**
     * Create a row element for a saved world.
     * @private
     */
    _createWorldRow(world) {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            transition: background 0.15s;
            cursor: pointer;
        `;
        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(0, 204, 204, 0.05)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = 'transparent';
        });

        // Thumbnail
        const thumb = document.createElement('div');
        thumb.style.cssText = `
            width: 48px;
            height: 36px;
            border-radius: 3px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: #000;
            flex-shrink: 0;
            overflow: hidden;
        `;
        if (world.thumbnail) {
            const img = document.createElement('img');
            img.src = world.thumbnail;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            thumb.appendChild(img);
        } else {
            thumb.style.display = 'flex';
            thumb.style.alignItems = 'center';
            thumb.style.justifyContent = 'center';
            thumb.style.fontSize = '16px';
            thumb.textContent = '🌍';
        }

        // Info
        const info = document.createElement('div');
        info.style.cssText = 'flex: 1; min-width: 0;';

        const name = document.createElement('div');
        name.textContent = world.name;
        name.style.cssText = `
            color: rgba(255, 255, 255, 0.85);
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        const time = document.createElement('div');
        time.textContent = this._formatTime(world.timestamp);
        time.style.cssText = `
            color: rgba(255, 255, 255, 0.35);
            font-size: 9px;
            margin-top: 2px;
        `;

        info.appendChild(name);
        info.appendChild(time);

        // Action buttons
        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 4px; flex-shrink: 0;';

        const loadBtn = this._createActionBtn('LOAD', 'rgba(0, 204, 204, 0.5)', async () => {
            await this._handleLoad(world.name);
        });

        const overwriteBtn = this._createConfirmBtn('SAVE', 'rgba(218, 165, 32, 0.5)', async () => {
            await this._handleOverwrite(world.name);
        });

        const deleteBtn = this._createConfirmBtn('\u00d7', 'rgba(255, 80, 80, 0.5)', async () => {
            await this._handleDelete(world.name);
        });
        deleteBtn.style.width = '24px';
        deleteBtn.style.padding = '4px 0';

        actions.appendChild(loadBtn);
        actions.appendChild(overwriteBtn);
        actions.appendChild(deleteBtn);

        row.appendChild(thumb);
        row.appendChild(info);
        row.appendChild(actions);

        return row;
    }

    /**
     * Create a small action button.
     * @private
     */
    _createActionBtn(label, borderColor, onClick) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid ${borderColor};
            color: rgba(255, 255, 255, 0.7);
            padding: 4px 8px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: bold;
            cursor: pointer;
            letter-spacing: 0.5px;
            transition: all 0.15s;
            touch-action: manipulation;
        `;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    /**
     * Create a button that requires two taps to confirm (tap → "OK?" → action).
     * @private
     */
    _createConfirmBtn(label, borderColor, onClick) {
        let confirmTimer = null;
        const btn = this._createActionBtn(label, borderColor, () => {
            if (confirmTimer) {
                // Second tap — confirmed
                clearTimeout(confirmTimer);
                btn.textContent = label;
                btn.style.borderColor = borderColor;
                confirmTimer = null;
                onClick();
            } else {
                // First tap — show confirmation state
                btn.textContent = 'OK?';
                btn.style.borderColor = 'rgba(255, 80, 80, 0.8)';
                confirmTimer = setTimeout(() => {
                    btn.textContent = label;
                    btn.style.borderColor = borderColor;
                    confirmTimer = null;
                }, 2000);
            }
        });
        return btn;
    }

    /**
     * Format timestamp for display.
     * @private
     */
    _formatTime(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

        const month = d.getMonth() + 1;
        const day = d.getDate();
        const hours = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${mins}`;
    }

    /**
     * Handle save button click.
     * @private
     */
    async _handleSave() {
        if (this._busy) return;
        const name = this.nameInput.value.trim();
        if (!name) {
            this.nameInput.style.borderColor = 'rgba(255, 80, 80, 0.6)';
            setTimeout(() => {
                this.nameInput.style.borderColor = 'rgba(0, 204, 204, 0.3)';
            }, 1000);
            return;
        }

        // Check if name already exists
        const worlds = await storageManager.getWorldList();
        const exists = worlds.find(w => w.name === name);

        if (exists) {
            // Overwrite existing — confirm first
            await this._handleOverwrite(name);
            return;
        }

        // Check slot limit
        if (worlds.length >= storageManager.MAX_SLOTS) {
            this._showNotification('Save slots full! Delete a world first.');
            return;
        }

        this._busy = true;
        this.saveBtn.textContent = '...';
        this.saveBtn.disabled = true;

        try {
            const success = await this._gameScene.worldSerializer.saveToSlot(name);
            if (success) {
                this._showNotification(`Saved "${name}"`);
                await this._refreshList();
                this.nameInput.value = '';
            } else {
                this._showNotification(this._saveErrorMessage());
            }
        } finally {
            this.saveBtn.textContent = 'SAVE';
            this.saveBtn.disabled = false;
            this._busy = false;
        }
    }

    /**
     * Handle loading a world.
     * @private
     */
    async _handleLoad(name) {
        if (this._busy) return;
        this._busy = true;
        try {
            const success = await this._gameScene.worldSerializer.loadFromSlot(name);
            if (success) {
                this.hide();
                this._gameScene.showSaveNotification(`Loaded "${name}"`);
                if (this._onLoadCallback) this._onLoadCallback();
            } else {
                this._showNotification('Load failed!');
            }
        } catch (e) {
            console.error('Load failed:', e);
            this._showNotification('Load failed!');
        } finally {
            this._busy = false;
        }
    }

    /**
     * Handle overwriting an existing save.
     * @private
     */
    async _handleOverwrite(name) {
        if (this._busy) return;
        this._busy = true;
        try {
            const success = await this._gameScene.worldSerializer.saveToSlot(name);
            if (success) {
                this._showNotification(`Saved "${name}"`);
                await this._refreshList();
            } else {
                this._showNotification(this._saveErrorMessage());
            }
        } catch (e) {
            console.error('Overwrite failed:', e);
            this._showNotification(this._saveErrorMessage());
        } finally {
            this._busy = false;
        }
    }

    /**
     * Handle deleting a world.
     * @private
     */
    async _handleDelete(name) {
        try {
            const success = await storageManager.deleteWorld(name);
            if (success) {
                this._showNotification(`Deleted "${name}"`);
                await this._refreshList();
            }
        } catch (e) {
            console.error('Delete failed:', e);
        }
    }

    /**
     * Return appropriate error message based on storageManager.lastError.
     * @private
     */
    _saveErrorMessage() {
        if (storageManager.lastError === 'quota') {
            return 'Storage full! Delete worlds to free space.';
        }
        return 'Save failed!';
    }

    /**
     * Show a brief inline notification in the modal.
     * @private
     */
    _showNotification(message) {
        // Reuse game scene notification if available
        if (this._gameScene && this._gameScene.showSaveNotification) {
            this._gameScene.showSaveNotification(message);
        }
    }
}

const saveLoadModal = new SaveLoadModal();
export default saveLoadModal;
