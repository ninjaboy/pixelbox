// helpers.cjs - Shared E2E test utilities
const { expect } = require('@playwright/test');

/**
 * Navigate from app start to GameScene (splash → menu → new game → ready)
 */
async function navigateToGame(page) {
    await page.goto('http://localhost:3000');

    // Wait for Phaser
    await page.waitForFunction(() => window.__pixelboxGame !== undefined, { timeout: 15000 });

    // Wait for MainMenuScene
    await page.waitForFunction(() => {
        const game = window.__pixelboxGame;
        return game?.scene?.scenes?.some(s => s.sys?.settings?.key === 'MainMenuScene' && s.sys?.settings?.active);
    }, { timeout: 10000 });

    await page.waitForTimeout(500);

    // Click "New Game" button
    const canvas = page.locator('#game-container canvas');
    const box = await canvas.boundingBox();
    const newGameY = box.y + box.height * 0.46;
    const centerX = box.x + box.width / 2;
    await page.mouse.click(centerX, newGameY);

    // Wait for GameScene ready
    await page.waitForFunction(() => window.__pixellenceScene?.sceneReady === true, { timeout: 15000 });
    await page.waitForTimeout(500);
}

/**
 * Draw a line on the canvas
 */
async function drawLine(page, fromXPct, fromYPct, toXPct, toYPct, steps = 10) {
    const canvas = page.locator('#game-container canvas');
    const box = await canvas.boundingBox();
    const fromX = box.x + box.width * fromXPct;
    const fromY = box.y + box.height * fromYPct;
    const toX = box.x + box.width * toXPct;
    const toY = box.y + box.height * toYPct;

    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.mouse.move(toX, toY, { steps });
    await page.mouse.up();
    await page.waitForTimeout(300);
}

/**
 * Get current particle count
 */
async function getParticleCount(page) {
    return await page.evaluate(() => window.__pixellenceScene?.pixelGrid?.particleCount || 0);
}

/**
 * Select an element by name (data-element attribute)
 */
async function selectElement(page, elementName) {
    const btn = page.locator(`.element-btn[data-element="${elementName}"]`);
    // Element might be in a different category, so we may need to scroll or it may not be visible
    // First check if visible
    if (await btn.isVisible()) {
        await btn.click();
    } else {
        // Try clicking it anyway (it might be in a hidden category)
        await btn.click({ force: true });
    }
    await page.waitForTimeout(200);
}

/**
 * Open the filter popup and select a category
 */
async function selectCategory(page, categoryId) {
    // Click filter button to open popup
    const filterBtn = page.locator('#filter-btn');
    const filterPopup = page.locator('#filter-popup');

    // Check if popup is already open
    const isOpen = await filterPopup.evaluate(el => el.classList.contains('open'));
    if (!isOpen) {
        await filterBtn.click();
        await page.waitForTimeout(200);
    }

    // Click the category option
    const option = page.locator(`.filter-option[data-category="${categoryId}"]`);
    if (await option.count() > 0) {
        await option.click();
    } else {
        // Try finding by text content
        const optionByText = filterPopup.locator(`text=${categoryId}`).first();
        await optionByText.click();
    }
    await page.waitForTimeout(300);
}

/**
 * Open settings modal
 */
async function openSettings(page) {
    await page.click('#settings-btn');
    await page.waitForSelector('#settings-overlay[style*="display: flex"]', { timeout: 3000 });
    await page.waitForTimeout(200);
}

/**
 * Close settings modal
 */
async function closeSettings(page) {
    await page.click('#settings-close');
    await page.waitForSelector('#settings-overlay', { state: 'hidden', timeout: 3000 });
    await page.waitForTimeout(200);
}

/**
 * Wait for a specific scene to be active
 */
async function waitForScene(page, sceneName, timeout = 10000) {
    await page.waitForFunction(
        (name) => window.__pixelboxGame?.scene?.isActive(name),
        sceneName,
        { timeout }
    );
}

/**
 * Get the name of the currently active scene
 */
async function getActiveScene(page) {
    return await page.evaluate(() => {
        const game = window.__pixelboxGame;
        if (!game) return null;
        const scenes = game.scene.scenes;
        for (const s of scenes) {
            if (s.sys?.settings?.active) return s.sys.settings.key;
        }
        return null;
    });
}

/**
 * Get canvas bounding box
 */
async function getCanvasBox(page) {
    const canvas = page.locator('#game-container canvas');
    return await canvas.boundingBox();
}

module.exports = {
    navigateToGame,
    drawLine,
    getParticleCount,
    selectElement,
    selectCategory,
    openSettings,
    closeSettings,
    waitForScene,
    getActiveScene,
    getCanvasBox,
};
