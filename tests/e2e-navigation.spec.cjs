/**
 * E2E Tests: Scene Navigation and Save/Load
 *
 * Tests the full scene lifecycle (splash -> menu -> game -> menu -> game)
 * and save/load functionality via the SaveLoadModal.
 *
 * Run: npx playwright test tests/e2e-navigation.spec.cjs
 * Requires: npm run dev (localhost:3000)
 */

const { test, expect } = require('@playwright/test');
const {
    navigateToGame,
    drawLine,
    getParticleCount,
    openSettings,
    waitForScene,
    getCanvasBox,
} = require('./helpers.cjs');

/**
 * Navigate from GameScene to MainMenuScene via settings overlay.
 */
async function goToMainMenu(page) {
    await openSettings(page);
    await page.click('#main-menu-btn');
    await waitForScene(page, 'MainMenuScene');
    await page.waitForTimeout(500);
}

/**
 * Click "New Game" on the MainMenuScene canvas.
 */
async function clickNewGame(page) {
    const canvas = page.locator('#game-container canvas');
    const box = await canvas.boundingBox();
    const centerX = box.x + box.width / 2;
    const newGameY = box.y + box.height * 0.46;
    await page.mouse.click(centerX, newGameY);
    await page.waitForFunction(() => window.__pixellenceScene?.sceneReady === true, { timeout: 15000 });
    await page.waitForTimeout(500);
}

/**
 * Click "Continue" on the MainMenuScene canvas (below New Game).
 */
async function clickContinue(page) {
    const canvas = page.locator('#game-container canvas');
    const box = await canvas.boundingBox();
    const centerX = box.x + box.width / 2;
    // Continue is the second button, below New Game (~54% height)
    const continueY = box.y + box.height * 0.54;
    await page.mouse.click(centerX, continueY);
    await page.waitForFunction(() => window.__pixellenceScene?.sceneReady === true, { timeout: 15000 });
    await page.waitForTimeout(500);
}

test.describe('Scene Navigation', () => {

    test('full scene lifecycle: splash -> menu -> game -> menu -> game', async ({ page }) => {
        await page.goto('http://localhost:3000');

        // Wait for Phaser init
        await page.waitForFunction(() => window.__pixelboxGame !== undefined, { timeout: 15000 });

        // Wait for MainMenuScene (splash auto-transitions or click to skip)
        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game?.scene?.isActive('SplashScene') || game?.scene?.isActive('MainMenuScene');
        }, { timeout: 10000 });

        // Click to skip splash if needed
        const canvas = page.locator('#game-container canvas');
        await canvas.click({ position: { x: 200, y: 300 } });

        await waitForScene(page, 'MainMenuScene');
        await page.waitForTimeout(500);

        // Click New Game
        await clickNewGame(page);

        // Verify game UI is visible
        const headerVisible = await page.evaluate(() => {
            const h = document.getElementById('game-header');
            return h && h.style.display !== 'none';
        });
        expect(headerVisible).toBe(true);

        const pickerVisible = await page.evaluate(() => {
            const p = document.getElementById('element-picker');
            return p && getComputedStyle(p).display !== 'none';
        });
        expect(pickerVisible).toBe(true);

        // Go back to menu
        await goToMainMenu(page);

        // Verify game header is hidden in menu
        const headerHiddenInMenu = await page.evaluate(() => {
            const h = document.getElementById('game-header');
            return h && h.style.display === 'none';
        });
        expect(headerHiddenInMenu).toBe(true);

        // Click New Game again
        await clickNewGame(page);

        // Verify game header visible again
        const headerVisibleAgain = await page.evaluate(() => {
            const h = document.getElementById('game-header');
            return h && h.style.display !== 'none';
        });
        expect(headerVisibleAgain).toBe(true);
    });

    test('Continue button preserves game state', async ({ page }) => {
        await navigateToGame(page);

        // Draw sand across the canvas
        await drawLine(page, 0.3, 0.3, 0.7, 0.3, 15);
        await page.waitForTimeout(500);

        const countBefore = await getParticleCount(page);
        expect(countBefore).toBeGreaterThan(0);

        // Go to main menu
        await goToMainMenu(page);

        // Click Continue
        await clickContinue(page);

        // Verify particles are preserved
        const countAfter = await getParticleCount(page);
        expect(countAfter).toBeGreaterThan(0);
        // Allow some variance since particles may have moved/settled
        expect(countAfter).toBeGreaterThanOrEqual(countBefore * 0.5);
    });

    test('game header shows during GameScene only', async ({ page }) => {
        await navigateToGame(page);

        // Header should be visible in GameScene
        let headerDisplay = await page.evaluate(() =>
            document.getElementById('game-header')?.style.display
        );
        expect(headerDisplay).not.toBe('none');

        // Go to menu
        await goToMainMenu(page);

        // Header should be hidden in menu
        headerDisplay = await page.evaluate(() =>
            document.getElementById('game-header')?.style.display
        );
        expect(headerDisplay).toBe('none');

        // Return to game
        await clickNewGame(page);

        // Header should be visible again
        headerDisplay = await page.evaluate(() =>
            document.getElementById('game-header')?.style.display
        );
        expect(headerDisplay).not.toBe('none');
    });

    test('element picker shows during GameScene only', async ({ page }) => {
        await navigateToGame(page);

        // Picker should be visible in GameScene
        let pickerVisible = await page.evaluate(() => {
            const p = document.getElementById('element-picker');
            return p && getComputedStyle(p).display !== 'none';
        });
        expect(pickerVisible).toBe(true);

        // Go to menu
        await goToMainMenu(page);

        // Picker should be hidden in menu
        let pickerHidden = await page.evaluate(() => {
            const p = document.getElementById('element-picker');
            return !p || getComputedStyle(p).display === 'none' || p.style.display === 'none';
        });
        expect(pickerHidden).toBe(true);

        // Return to game
        await clickNewGame(page);

        // Picker should be visible again
        pickerVisible = await page.evaluate(() => {
            const p = document.getElementById('element-picker');
            return p && getComputedStyle(p).display !== 'none';
        });
        expect(pickerVisible).toBe(true);
    });
});

test.describe('Save and Load', () => {

    test('save world and load it back', async ({ page }) => {
        await navigateToGame(page);

        // Draw sand across the canvas
        await drawLine(page, 0.2, 0.4, 0.8, 0.4, 20);
        await page.waitForTimeout(1000); // Let particles settle

        const countAfterDraw = await getParticleCount(page);
        expect(countAfterDraw).toBeGreaterThan(0);

        // Open save/load modal via worlds button in header
        await page.click('#worlds-btn');
        await page.waitForSelector('#saveload-overlay[style*="display: flex"]', { timeout: 5000 });

        // Clear name input and type a unique name
        const testWorldName = `Test World ${Date.now()}`;
        await page.fill('#saveload-overlay input[type="text"]', testWorldName);

        // Click SAVE button (the button next to the input)
        const saveBtn = page.locator('#saveload-overlay button').filter({ hasText: 'SAVE' }).first();
        await saveBtn.click();

        // Wait for save to complete (button text changes to '...' then back to 'SAVE')
        await page.waitForFunction(() => {
            const btns = document.querySelectorAll('#saveload-overlay button');
            for (const b of btns) {
                if (b.textContent === 'SAVE' && !b.disabled) return true;
            }
            return false;
        }, { timeout: 10000 });
        await page.waitForTimeout(500);

        // Close the modal
        // Click the X close button in the modal header
        const closeBtn = page.locator('#saveload-modal button').filter({ hasText: '\u00d7' }).first();
        await closeBtn.click();
        await page.waitForSelector('#saveload-overlay', { state: 'hidden', timeout: 5000 });

        // Start a fresh game: go to menu -> new game
        await goToMainMenu(page);
        await clickNewGame(page);

        // Verify fresh game has 0 or near-0 particles
        const freshCount = await getParticleCount(page);
        expect(freshCount).toBeLessThan(countAfterDraw * 0.1);

        // Open save/load modal again
        await page.click('#worlds-btn');
        await page.waitForSelector('#saveload-overlay[style*="display: flex"]', { timeout: 5000 });
        await page.waitForTimeout(500);

        // Find and click LOAD button for our saved world
        // World rows contain the world name and a LOAD button
        const loadBtn = page.locator('#saveload-overlay button').filter({ hasText: 'LOAD' }).first();
        await loadBtn.click();

        // Wait for load to complete (modal closes automatically on successful load)
        await page.waitForSelector('#saveload-overlay', { state: 'hidden', timeout: 10000 });
        await page.waitForTimeout(1000);

        // Verify particles were restored
        const restoredCount = await getParticleCount(page);
        expect(restoredCount).toBeGreaterThan(0);
    });

    test('auto-save happens on scene exit', async ({ page }) => {
        await navigateToGame(page);

        // Draw sand
        await drawLine(page, 0.3, 0.35, 0.7, 0.35, 15);
        await page.waitForTimeout(500);

        const countBefore = await getParticleCount(page);
        expect(countBefore).toBeGreaterThan(0);

        // Go to menu (should trigger auto-save)
        await goToMainMenu(page);

        // Click Continue (should restore auto-saved state)
        await clickContinue(page);

        // Verify particles are preserved
        const countAfter = await getParticleCount(page);
        expect(countAfter).toBeGreaterThan(0);
        // Auto-save should preserve most particles
        expect(countAfter).toBeGreaterThanOrEqual(countBefore * 0.5);
    });
});
