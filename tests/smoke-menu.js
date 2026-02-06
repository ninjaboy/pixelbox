/**
 * Smoke Test: Menu buttons not responding after scene transition
 *
 * Bug: After pressing ☰ (menu button) in GameScene, the MainMenuScene
 * loads but its buttons (New Game, Continue, Settings) don't respond
 * to clicks/taps.
 *
 * Root causes fixed:
 * 1. Hiding game-header shifts canvas position but Phaser's cached
 *    bounds weren't updated → pointer coordinates were wrong.
 * 2. DOM overlays (settings-overlay, grimoire-overlay) with z-index 20000
 *    could sit above the canvas and swallow pointer events.
 * 3. GameScene.shutdown() was never registered with Phaser's event system,
 *    leaking auto-save timers across scene transitions.
 * 4. Phaser input plugin could be stale after scene.stop→start from a
 *    DOM handler (not from within a Phaser scene).
 *
 * Run: npx playwright test tests/smoke-menu.js
 * Requires: npm run dev (localhost:3000)
 */

const { test, expect } = require('@playwright/test');

test.describe('Menu Button Scene Transition', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');

        // Wait for Phaser to initialize
        await page.waitForFunction(() => window.__pixelboxGame !== undefined, { timeout: 15000 });

        // Wait for initial scene (SplashScene or MainMenuScene) to be active
        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('SplashScene') || game.scene.isActive('MainMenuScene');
        }, { timeout: 10000 });

        // Skip splash → get to MainMenuScene
        const canvas = page.locator('canvas');
        await canvas.click({ position: { x: 200, y: 300 } });

        // Wait for MainMenuScene
        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('MainMenuScene');
        }, { timeout: 10000 });
    });

    test('MainMenuScene buttons respond on first load', async ({ page }) => {
        // Verify MainMenuScene is active and has interactive objects
        const hasInteractive = await page.evaluate(() => {
            const game = window.__pixelboxGame;
            const scene = game.scene.getScene('MainMenuScene');
            return scene.input.list.length > 0;
        });
        expect(hasInteractive).toBe(true);

        // Click "New Game" button area (center of screen, ~46% height)
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        const newGameY = box.height * 0.46;

        await canvas.click({ position: { x: box.width / 2, y: newGameY } });

        // Wait for GameScene to start (fade takes 500ms)
        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('GameScene');
        }, { timeout: 5000 });

        expect(true).toBe(true); // If we got here, New Game button worked
    });

    test('Menu buttons respond after GameScene → MainMenuScene transition', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();

        // Step 1: Click "New Game" to enter GameScene
        const newGameY = box.height * 0.46;
        await canvas.click({ position: { x: box.width / 2, y: newGameY } });

        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('GameScene');
        }, { timeout: 5000 });

        // Step 2: Wait for GameScene to be fully ready
        await page.waitForFunction(() => {
            return window.__pixellenceScene && window.__pixellenceScene.sceneReady;
        }, { timeout: 10000 });

        // Step 3: Click ☰ menu button (DOM button in game-header)
        await page.click('#settings-btn');

        // Step 4: Wait for MainMenuScene to become active
        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('MainMenuScene');
        }, { timeout: 5000 });

        // Step 5: Verify MainMenuScene input is properly enabled
        const inputState = await page.evaluate(() => {
            const game = window.__pixelboxGame;
            const scene = game.scene.getScene('MainMenuScene');
            return {
                inputEnabled: scene.input.enabled,
                managerEnabled: scene.input.manager.enabled,
                interactiveCount: scene.input.list.length,
            };
        });

        expect(inputState.inputEnabled).toBe(true);
        expect(inputState.managerEnabled).toBe(true);
        expect(inputState.interactiveCount).toBeGreaterThan(0);

        // Step 6: Verify no DOM overlays are blocking the canvas
        const overlayBlocking = await page.evaluate(() => {
            const overlays = ['settings-overlay', 'grimoire-overlay'];
            for (const id of overlays) {
                const el = document.getElementById(id);
                if (el && el.style.display !== 'none') return id;
            }
            // Check game-header is hidden
            const header = document.getElementById('game-header');
            if (header && header.style.display !== 'none') return 'game-header';
            return null;
        });
        expect(overlayBlocking).toBeNull();

        // Step 7: Click "New Game" button again to verify buttons actually work
        await canvas.click({ position: { x: box.width / 2, y: newGameY } });

        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('GameScene');
        }, { timeout: 5000 });

        console.log('PASS: Menu buttons respond after scene transition');
    });

    test('GameScene auto-save timer is cleaned up on scene stop', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();

        // Enter GameScene
        const newGameY = box.height * 0.46;
        await canvas.click({ position: { x: box.width / 2, y: newGameY } });

        await page.waitForFunction(() => {
            return window.__pixellenceScene && window.__pixellenceScene.sceneReady;
        }, { timeout: 10000 });

        // Check that auto-save timer is running
        const hasTimer = await page.evaluate(() => {
            return window.__pixellenceScene.autoSaveTimer !== null;
        });
        expect(hasTimer).toBe(true);

        // Go back to menu
        await page.click('#settings-btn');

        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('MainMenuScene');
        }, { timeout: 5000 });

        // Verify auto-save timer was cleaned up
        const timerCleared = await page.evaluate(() => {
            const scene = window.__pixelboxGame.scene.getScene('GameScene');
            return scene.autoSaveTimer === null;
        });
        expect(timerCleared).toBe(true);

        console.log('PASS: Auto-save timer cleaned up on scene stop');
    });

    test('Settings button opens settings overlay from MainMenuScene', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();

        // First go to GameScene then back to menu (the bug scenario)
        const newGameY = box.height * 0.46;
        await canvas.click({ position: { x: box.width / 2, y: newGameY } });

        await page.waitForFunction(() => {
            return window.__pixellenceScene && window.__pixellenceScene.sceneReady;
        }, { timeout: 10000 });

        await page.click('#settings-btn');

        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game.scene.isActive('MainMenuScene');
        }, { timeout: 5000 });

        // Now click the Settings button in MainMenuScene
        // Settings is the 3rd button: startY + (48 + 20) * 2
        const settingsY = box.height * 0.46 + (48 + 20) * 2;
        await canvas.click({ position: { x: box.width / 2, y: settingsY } });

        // Wait a moment for the settings overlay to appear
        await page.waitForTimeout(500);

        const settingsVisible = await page.evaluate(() => {
            const el = document.getElementById('settings-overlay');
            return el && el.style.display === 'flex';
        });
        expect(settingsVisible).toBe(true);

        console.log('PASS: Settings button works after scene transition');
    });
});
