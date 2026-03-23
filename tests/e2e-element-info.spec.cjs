/**
 * E2E Tests: Element Info Popup (long-press)
 *
 * Tests that long-pressing an element button shows the detail popup
 * with element name, properties, and description.
 *
 * Run: npx playwright test tests/e2e-element-info.spec.cjs
 */

const { test, expect } = require('@playwright/test');
const { navigateToGame } = require('./helpers.cjs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

/**
 * Long-press an element button by holding touch for a duration.
 * Uses Playwright's touchscreen API (hasTouch: true in config).
 */
async function longPressElement(page, elementName, holdMs = 600) {
    const btn = page.locator(`.element-btn[data-element="${elementName}"]`);
    const box = await btn.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.touchscreen.tap(cx, cy);
    // touchscreen.tap is instant — we need a manual hold via mouse with touch simulation
    // Use mouse-based long press which also triggers the long-press handler via mousedown
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(holdMs);
    // Popup should now be visible — don't release yet for screenshot
    return { cx, cy };
}

test.describe('Element Info Popup', () => {

    test.beforeEach(async ({ page }) => {
        // Full reload ensures clean Phaser state between tests
        await page.goto('about:blank');
        await navigateToGame(page);
    });

    test('long-press on element shows info popup with name and description', async ({ page }) => {
        const popup = page.locator('#element-detail-popup');

        // Popup should be hidden initially
        await expect(popup).toBeHidden();

        // Long-press on sand button (it's the default active element, always visible)
        const { cx, cy } = await longPressElement(page, 'sand');

        // Popup should now be visible
        await expect(popup).toBeVisible();

        // Verify popup contains the element name
        const nameEl = page.locator('#detail-name');
        await expect(nameEl).toHaveText(/sand/i);

        // Verify popup has property tags
        const propsEl = page.locator('#detail-props');
        const tagsCount = await propsEl.locator('.detail-prop-tag').count();
        expect(tagsCount).toBeGreaterThan(0);

        // Verify state tag shows POWDER for sand
        const stateTag = propsEl.locator('.state-tag');
        await expect(stateTag).toHaveText(/powder/i);

        // Verify description is populated
        const descEl = page.locator('#detail-desc');
        const descText = await descEl.textContent();
        expect(descText.length).toBeGreaterThan(5);

        // Take screenshot of the popup
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'element-info-sand.png') });

        // Release to dismiss
        await page.mouse.up();

        // Popup should hide after release
        await expect(popup).toBeHidden();
    });

    test('long-press on different elements shows correct info', async ({ page }) => {
        const popup = page.locator('#element-detail-popup');
        const nameEl = page.locator('#detail-name');

        // Test water element
        const waterBtn = page.locator('.element-btn[data-element="water"]');
        if (await waterBtn.isVisible()) {
            await longPressElement(page, 'water');
            await expect(popup).toBeVisible();
            await expect(nameEl).toHaveText(/water/i);

            // Water should be LIQUID state
            const stateTag = page.locator('#detail-props .state-tag');
            await expect(stateTag).toHaveText(/liquid/i);

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'element-info-water.png') });
            await page.mouse.up();
            await expect(popup).toBeHidden();
        }

        // Test fire element
        await longPressElement(page, 'fire');
        await expect(popup).toBeVisible();
        await expect(nameEl).toHaveText(/fire/i);

        // Fire should be GAS state
        const stateTag = page.locator('#detail-props .state-tag');
        await expect(stateTag).toHaveText(/gas/i);

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'element-info-fire.png') });
        await page.mouse.up();
        await expect(popup).toBeHidden();
    });

    test('long-press on tool shows TOOL tag', async ({ page }) => {
        const popup = page.locator('#element-detail-popup');

        // Long-press on eraser tool
        await longPressElement(page, 'eraser');
        await expect(popup).toBeVisible();

        // Should show TOOL tag instead of state
        const stateTag = page.locator('#detail-props .state-tag');
        await expect(stateTag).toHaveText(/tool/i);

        // Name should be eraser
        const nameEl = page.locator('#detail-name');
        await expect(nameEl).toHaveText(/eraser/i);

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'element-info-eraser.png') });
        await page.mouse.up();
        await expect(popup).toBeHidden();
    });

    test('popup contains density tag for elements', async ({ page }) => {
        const popup = page.locator('#element-detail-popup');

        await longPressElement(page, 'stone');
        await expect(popup).toBeVisible();

        // Stone should have a density tag
        const densityTag = page.locator('#detail-props .density-tag');
        await expect(densityTag).toBeVisible();
        await expect(densityTag).toHaveText(/density/i);

        await page.mouse.up();
    });

    test('popup has hint text for dismissal', async ({ page }) => {
        await longPressElement(page, 'sand');

        const hint = page.locator('#detail-hint');
        await expect(hint).toBeVisible();
        await expect(hint).toHaveText(/release to dismiss/i);

        await page.mouse.up();
    });

    test('short tap selects element without showing popup', async ({ page }) => {
        const popup = page.locator('#element-detail-popup');

        // Quick click on water — should select, not show popup
        const waterBtn = page.locator('.element-btn[data-element="water"]');
        await waterBtn.click();
        await page.waitForTimeout(200);

        // Popup should NOT be visible
        await expect(popup).toBeHidden();

        // Water should now be the active element
        await expect(waterBtn).toHaveClass(/active/);
    });
});
