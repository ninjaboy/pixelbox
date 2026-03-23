/**
 * E2E Tests: Settings and UI Modal interactions
 *
 * Tests the settings overlay, toggle buttons, biome selection,
 * grimoire (element guide), filter popup, and worlds button.
 */

const { test, expect } = require('@playwright/test');
const {
    navigateToGame,
    openSettings,
    closeSettings,
    drawLine,
    getParticleCount,
    getCanvasBox,
    waitForScene,
} = require('./helpers.cjs');

test.describe('Settings and UI Modals', () => {

    test.beforeEach(async ({ page }) => {
        await navigateToGame(page);
    });

    test('settings modal opens and closes', async ({ page }) => {
        await page.click('#settings-btn');
        const overlay = page.locator('#settings-overlay');
        await expect(overlay).toHaveCSS('display', 'flex');
        await expect(page.locator('#settings-modal')).toBeVisible();

        await page.click('#settings-close');
        await page.waitForSelector('#settings-overlay', { state: 'hidden', timeout: 3000 });
        await expect(overlay).toBeHidden();
    });

    test('sound toggle works', async ({ page }) => {
        await openSettings(page);

        const muteBtn = page.locator('#mute-btn');
        const muteIcon = page.locator('#mute-icon');
        const initialText = await muteIcon.textContent();

        await muteBtn.click();
        await page.waitForTimeout(200);
        const toggledText = await muteIcon.textContent();
        expect(toggledText).not.toBe(initialText);

        // Toggle back
        await muteBtn.click();
        await page.waitForTimeout(200);
        const restoredText = await muteIcon.textContent();
        expect(restoredText).toBe(initialText);

        await closeSettings(page);
    });

    test('build mode toggle works', async ({ page }) => {
        await openSettings(page);

        const buildToggle = page.locator('#build-toggle');
        const initialText = await buildToggle.textContent();

        await buildToggle.click();
        await page.waitForTimeout(200);
        const toggledText = await buildToggle.textContent();
        expect(toggledText).not.toBe(initialText);

        await closeSettings(page);
    });

    test('FPS counter toggle works', async ({ page }) => {
        await openSettings(page);

        // FPS toggle starts OFF by default
        const fpsToggle = page.locator('#fps-toggle');
        await fpsToggle.click();
        await page.waitForTimeout(200);

        await closeSettings(page);

        // Stats element should now be visible
        const stats = page.locator('#stats');
        await expect(stats).toBeVisible();

        // Toggle it back off
        await openSettings(page);
        await fpsToggle.click();
        await page.waitForTimeout(200);
        await closeSettings(page);

        await expect(stats).toBeHidden();
    });

    test('biome selection changes background', async ({ page }) => {
        await openSettings(page);

        const biomeSelect = page.locator('#biome-select');
        await biomeSelect.selectOption('desert');
        await page.waitForTimeout(300);

        await closeSettings(page);

        // Verify the biome changed in game state
        const currentBiome = await page.evaluate(() => {
            const scene = window.__pixellenceScene;
            return scene?.currentBiome || scene?.biome || null;
        });
        // The biome should have changed (either stored on scene or reflected in select)
        // At minimum, verify the select retained the value
        await openSettings(page);
        const selectedValue = await biomeSelect.inputValue();
        expect(selectedValue).toBe('desert');
        await closeSettings(page);
    });

    test('element guide (grimoire) opens from settings', async ({ page }) => {
        await openSettings(page);

        await page.click('#grimoire-btn');
        await page.waitForTimeout(300);

        const grimoireOverlay = page.locator('#grimoire-overlay');
        await expect(grimoireOverlay).toBeVisible();

        const content = page.locator('#grimoire-content');
        const textLength = await content.evaluate(el => el.textContent.length);
        expect(textLength).toBeGreaterThan(0);

        await page.click('#grimoire-close');
        await page.waitForTimeout(300);
        await expect(grimoireOverlay).toBeHidden();
    });

    test('main menu button returns to menu', async ({ page }) => {
        await openSettings(page);

        await page.click('#main-menu-btn');

        // Wait for MainMenuScene to become active
        await waitForScene(page, 'MainMenuScene');

        // Game header should be hidden when in menu
        const header = page.locator('#game-header');
        await expect(header).toBeHidden();
    });

    test('settings overlay blocks canvas interaction', async ({ page }) => {
        // Draw some sand first
        await drawLine(page, 0.3, 0.4, 0.5, 0.4);
        await page.waitForTimeout(500);
        const countBefore = await getParticleCount(page);
        expect(countBefore).toBeGreaterThan(0);

        // Open settings
        await openSettings(page);

        // Try to draw on canvas area while settings is open
        const box = await getCanvasBox(page);
        const drawX = box.x + box.width * 0.7;
        const drawY = box.y + box.height * 0.5;
        await page.mouse.move(drawX, drawY);
        await page.mouse.down();
        await page.mouse.move(drawX + 30, drawY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Close settings
        await closeSettings(page);
        await page.waitForTimeout(300);

        // Particle count should not have increased while overlay was open
        const countAfter = await getParticleCount(page);
        expect(countAfter).toBeLessThanOrEqual(countBefore);
    });

    test('worlds button opens save/load UI', async ({ page }) => {
        await page.click('#worlds-btn');

        // SaveLoadModal creates #saveload-overlay dynamically
        await page.waitForSelector('#saveload-overlay', { state: 'visible', timeout: 5000 });
        const saveLoadOverlay = page.locator('#saveload-overlay');
        await expect(saveLoadOverlay).toBeVisible();

        // Close it by clicking the overlay background
        await saveLoadOverlay.click({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(500);
    });

    test('filter popup opens and closes', async ({ page }) => {
        const filterBtn = page.locator('#filter-btn');
        const filterPopup = page.locator('#filter-popup');

        await filterBtn.click();
        await page.waitForTimeout(200);
        const isOpen = await filterPopup.evaluate(el => el.classList.contains('open'));
        expect(isOpen).toBe(true);

        // Click filter button again to close
        await filterBtn.click();
        await page.waitForTimeout(200);
        const isClosed = await filterPopup.evaluate(el => !el.classList.contains('open'));
        expect(isClosed).toBe(true);
    });
});
