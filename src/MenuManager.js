// MenuManager - Handles game menu, templates, and settings
import WorldTemplates from './WorldTemplates.js';

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

        // Share World button
        document.getElementById('share-world-btn')?.addEventListener('click', () => {
            this.shareWorld();
        });

        // Import World button
        document.getElementById('import-world-btn')?.addEventListener('click', () => {
            this.importWorld();
        });

        // Set menu version
        const menuVersion = document.getElementById('menu-version');
        if (menuVersion && this.gameScene.versionText) {
            menuVersion.textContent = this.gameScene.versionText.textContent;
        }
    }

    showMenu() {
        this.menuOverlay.style.display = 'flex';
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
    }

    startNewGame() {
        console.log('🎮 Starting new game...');
        this.gameScene.resetWorld();
        this.hideMenu();
    }

    loadTemplate(templateId) {
        const template = this.templates[templateId];
        if (!template) {
            console.error(`Template ${templateId} not found`);
            return;
        }

        console.log(`🌍 Loading template: ${template.name}`);
        this.gameScene.resetWorld();

        // Call the template's generate function with proper binding
        template.generate.call(this.worldTemplates, this.gameScene);

        this.hideMenu(); // ✅ FIX: Menu now closes after template loads
    }

    shareWorld() {
        this.gameScene.worldSerializer.copyToClipboard();
        alert('World code copied to clipboard! 📋\nShare it with friends to let them play your creation.');
        this.hideMenu();
    }

    importWorld() {
        const success = this.gameScene.worldSerializer.showImportDialog();
        if (success) {
            this.hideMenu();
        }
    }
}
