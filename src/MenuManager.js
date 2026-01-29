// MenuManager - Handles game menu, templates, and settings
import WorldTemplates from './WorldTemplates.js';
import { getAvailableWorlds, loadWorldByName } from '../worlds.config.js';
import purchaseManager, { PRODUCT_PRICE } from './PurchaseManager.js';

export default class MenuManager {
    constructor(gameScene) {
        this.gameScene = gameScene;
        this.menuOverlay = null;
        this.currentView = 'main'; // 'main', 'templates', or 'settings'
        this.worldTemplates = new WorldTemplates(gameScene);
        this.templates = this.worldTemplates.getAllTemplates();
    }

    init() {
        this.menuOverlay = document.getElementById('menu-overlay');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close menu button
        document.getElementById('close-menu-btn')?.addEventListener('click', () => {
            this.hideMenu();
        });

        // Click overlay to close
        this.menuOverlay?.addEventListener('click', (e) => {
            if (e.target === this.menuOverlay) {
                this.hideMenu();
            }
        });

        // New Game button
        document.getElementById('new-game-btn')?.addEventListener('click', () => {
            this.startNewGame();
        });

        // Templates button
        document.getElementById('templates-btn')?.addEventListener('click', () => {
            this.showTemplates();
        });

        // Back button
        document.getElementById('back-btn')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Template selection buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.currentTarget.dataset.template;
                this.loadTemplate(templateId);
            });
        });

        // Export World button
        document.getElementById('export-world-btn')?.addEventListener('click', () => {
            this.exportWorld();
        });

        // Import World button
        document.getElementById('import-world-btn')?.addEventListener('click', () => {
            this.importWorld();
        });

        // Restore Purchases button
        document.getElementById('restore-purchases-btn')?.addEventListener('click', () => {
            this.restorePurchases();
        });

        // Unlock All button (from menu)
        document.getElementById('unlock-all-btn')?.addEventListener('click', () => {
            this.unlockAll();
        });

        // Set menu version
        const menuVersion = document.getElementById('menu-version');
        if (menuVersion && this.gameScene.versionText) {
            menuVersion.textContent = this.gameScene.versionText.textContent;
        }
    }

    showMenu() {
        this.menuOverlay.style.display = 'flex';
        this.updatePurchaseUI();
        this.showMainMenu();
    }

    hideMenu() {
        this.menuOverlay.style.display = 'none';
    }

    showMainMenu() {
        this.currentView = 'main';
        document.getElementById('main-menu').style.display = 'flex';
        document.getElementById('template-menu').style.display = 'none';
    }

    showTemplates() {
        this.currentView = 'templates';
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('template-menu').style.display = 'flex';

        // Show available pre-made worlds if any
        this.updatePremadeWorldsList();
    }

    updatePremadeWorldsList() {
        const availableWorlds = getAvailableWorlds();
        const container = document.getElementById('premade-worlds-container');

        if (!container) return;

        if (availableWorlds.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const listContainer = document.getElementById('premade-worlds-list');
        listContainer.innerHTML = '';

        availableWorlds.forEach(world => {
            const btn = document.createElement('button');
            btn.className = 'template-btn';
            btn.innerHTML = `
                <div class="template-icon">${world.icon}</div>
                <div class="template-name">${world.name}</div>
                <div class="template-desc">${world.description}</div>
            `;
            btn.addEventListener('click', () => {
                this.loadPremadeWorld(world.name);
            });
            listContainer.appendChild(btn);
        });
    }

    async loadPremadeWorld(worldName) {
        try {
            await loadWorldByName(worldName, this.gameScene.worldSerializer);
            this.hideMenu();
        } catch (error) {
            console.error(`❌ Failed to load pre-made world:`, error);
            alert(`Failed to load world: ${error.message}`);
        }
    }

    startNewGame() {
        this.gameScene.resetWorld();
        this.hideMenu();
    }

    loadTemplate(templateId) {
        const template = this.templates[templateId];
        if (!template) {
            console.error(`Template ${templateId} not found`);
            return;
        }
        this.gameScene.resetWorld();

        // Call the template's generate function with proper binding
        template.generate.call(this.worldTemplates, this.gameScene);

        this.hideMenu(); // ✅ FIX: Menu now closes after template loads
    }

    async exportWorld() {
        await this.gameScene.worldSerializer.showExportDialog();
        this.hideMenu();
    }

    async importWorld() {
        const success = await this.gameScene.worldSerializer.showDownloadDialog();
        if (success) {
            this.hideMenu();
        }
    }

    async restorePurchases() {
        const btn = document.getElementById('restore-purchases-btn');
        if (btn) {
            btn.textContent = 'Restoring...';
            btn.style.opacity = '0.6';
        }

        const restored = await purchaseManager.restorePurchases();

        if (btn) {
            btn.textContent = restored ? '✅ Restored!' : 'No purchases found';
            btn.style.opacity = '1';
            setTimeout(() => {
                this.updatePurchaseUI();
            }, 1500);
        }
    }

    async unlockAll() {
        const btn = document.getElementById('unlock-all-btn');
        if (btn) {
            btn.textContent = '⏳ Unlocking...';
            btn.style.opacity = '0.6';
        }

        const success = await purchaseManager.unlock();

        if (success && btn) {
            btn.textContent = '🎉 Unlocked!';
            setTimeout(() => {
                this.updatePurchaseUI();
            }, 1000);
        }
    }

    /**
     * Update purchase-related UI in the menu based on unlock state
     */
    updatePurchaseUI() {
        const unlockBtn = document.getElementById('unlock-all-btn');
        const restoreBtn = document.getElementById('restore-purchases-btn');

        if (purchaseManager.isUnlocked()) {
            if (unlockBtn) {
                unlockBtn.textContent = '✅ All Elements Unlocked';
                unlockBtn.style.opacity = '0.5';
                unlockBtn.style.pointerEvents = 'none';
            }
            if (restoreBtn) {
                restoreBtn.style.display = 'none';
            }
        } else {
            if (unlockBtn) {
                unlockBtn.textContent = `✨ Unlock All Elements — ${PRODUCT_PRICE}`;
                unlockBtn.style.opacity = '1';
                unlockBtn.style.pointerEvents = '';
            }
            if (restoreBtn) {
                restoreBtn.textContent = '🔄 Restore Purchases';
                restoreBtn.style.display = '';
            }
        }
    }
}
