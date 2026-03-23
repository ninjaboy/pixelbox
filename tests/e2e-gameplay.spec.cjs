/**
 * E2E Tests: Core Gameplay
 *
 * Tests for drawing, element switching, category filtering,
 * eraser tool, speed controls, and element interactions.
 *
 * Run: npx playwright test tests/e2e-gameplay.spec.cjs
 */

const { test, expect } = require('@playwright/test');
const {
    navigateToGame,
    drawLine,
    getParticleCount,
    selectElement,
    getCanvasBox,
} = require('./helpers.cjs');

test.describe('Core Gameplay', () => {

    test.beforeEach(async ({ page }) => {
        await navigateToGame(page);
    });

    test('game loads and displays particles after drawing', async ({ page }) => {
        // Draw sand across center of canvas (percentages: 0-1)
        await drawLine(page, 0.4, 0.5, 0.6, 0.5);
        await page.waitForTimeout(300);

        const count = await getParticleCount(page);
        expect(count).toBeGreaterThan(0);
    });

    test('can switch elements and draw with different materials', async ({ page }) => {
        // Draw sand (default element)
        await drawLine(page, 0.2, 0.3, 0.4, 0.3);
        await page.waitForTimeout(300);
        const afterSand = await getParticleCount(page);
        expect(afterSand).toBeGreaterThan(0);

        // Switch to water and draw
        await selectElement(page, 'water');
        await drawLine(page, 0.6, 0.3, 0.8, 0.3);
        await page.waitForTimeout(300);
        const afterWater = await getParticleCount(page);
        expect(afterWater).toBeGreaterThan(afterSand);

        // Switch to fire and draw
        await selectElement(page, 'fire');
        await drawLine(page, 0.2, 0.6, 0.4, 0.6);
        await page.waitForTimeout(300);
        const afterFire = await getParticleCount(page);
        expect(afterFire).toBeGreaterThan(afterWater);
    });

    test('category filter shows correct elements', async ({ page }) => {
        // Open filter popup
        const filterBtn = page.locator('#filter-btn');
        await filterBtn.click();

        const filterPopup = page.locator('#filter-popup');
        await expect(filterPopup).toBeVisible();

        // Click "Liquids" category filter
        const liquidsOption = filterPopup.locator('.filter-option[data-category="liquids"]');
        await liquidsOption.click();
        await page.waitForTimeout(300);

        // Verify liquid elements are visible
        for (const el of ['water', 'oil', 'lava', 'acid', 'slush']) {
            const btn = page.locator(`.element-btn[data-element="${el}"]`);
            if (await btn.count() > 0) {
                await expect(btn).toBeVisible();
            }
        }

        // Verify non-liquid elements are hidden
        for (const el of ['sand', 'stone', 'fire', 'wood']) {
            const btn = page.locator(`.element-btn[data-element="${el}"]`);
            if (await btn.count() > 0) {
                await expect(btn).toBeHidden();
            }
        }

        // Open filter again and click "All" to reset
        await filterBtn.click();
        await page.waitForTimeout(200);
        const allOption = filterPopup.locator('.filter-option[data-category="all"]');
        await allOption.click();
        await page.waitForTimeout(300);

        // Verify all elements shown again
        for (const el of ['sand', 'water', 'fire', 'stone']) {
            const btn = page.locator(`.element-btn[data-element="${el}"]`);
            if (await btn.count() > 0) {
                await expect(btn).toBeVisible();
            }
        }
    });

    test('eraser tool removes particles', async ({ page }) => {
        // Draw a wall floor so sand stays put
        await selectElement(page, 'wall');
        await drawLine(page, 0.2, 0.6, 0.8, 0.6);
        await page.waitForTimeout(200);

        // Draw sand above the floor
        await selectElement(page, 'sand');
        await drawLine(page, 0.25, 0.45, 0.75, 0.45);
        await drawLine(page, 0.25, 0.4, 0.75, 0.4);
        await page.waitForTimeout(500);

        const beforeErase = await getParticleCount(page);
        expect(beforeErase).toBeGreaterThan(0);

        // Select eraser and draw over the area
        await selectElement(page, 'eraser');
        await drawLine(page, 0.2, 0.35, 0.8, 0.35);
        await drawLine(page, 0.2, 0.4, 0.8, 0.4);
        await drawLine(page, 0.2, 0.45, 0.8, 0.45);
        await drawLine(page, 0.2, 0.5, 0.8, 0.5);
        await drawLine(page, 0.2, 0.55, 0.8, 0.55);
        await drawLine(page, 0.2, 0.6, 0.8, 0.6);
        await page.waitForTimeout(500);

        const afterErase = await getParticleCount(page);
        expect(afterErase).toBeLessThan(beforeErase);
    });

    test('speed controls change simulation speed', async ({ page }) => {
        const speedDisplay = page.locator('#speed-display');
        const initialText = await speedDisplay.textContent();

        // Speed up
        await page.locator('#speed-up').click();
        await page.waitForTimeout(200);
        const afterSpeedUp = await speedDisplay.textContent();
        expect(afterSpeedUp).not.toBe(initialText);

        // Speed down (back to original)
        await page.locator('#speed-down').click();
        await page.waitForTimeout(200);
        const afterSpeedDown = await speedDisplay.textContent();
        expect(afterSpeedDown).toBe(initialText);

        // Speed down again — should not go below minimum
        await page.locator('#speed-down').click();
        await page.waitForTimeout(200);
        const afterMinSpeed = await speedDisplay.textContent();
        expect(afterMinSpeed).toBeTruthy();
    });

    test('element interactions work (sand falls through water)', async ({ page }) => {
        // Draw a container with walls
        await selectElement(page, 'wall');
        await drawLine(page, 0.25, 0.7, 0.75, 0.7);  // floor
        await drawLine(page, 0.25, 0.2, 0.25, 0.7);   // left wall
        await drawLine(page, 0.75, 0.2, 0.75, 0.7);   // right wall
        await page.waitForTimeout(200);

        // Draw water across the middle
        await selectElement(page, 'water');
        await drawLine(page, 0.3, 0.45, 0.7, 0.45);
        await drawLine(page, 0.3, 0.48, 0.7, 0.48);
        await drawLine(page, 0.3, 0.42, 0.7, 0.42);
        await page.waitForTimeout(1000); // let water settle

        // Draw sand above the water
        await selectElement(page, 'sand');
        await drawLine(page, 0.35, 0.25, 0.65, 0.25);
        await page.waitForTimeout(2000); // let physics run — sand sinks through water

        // Check that sand particles exist in the lower half of the grid
        const sandBelow = await page.evaluate(() => {
            const scene = window.__pixellenceScene;
            if (!scene?.pixelGrid) return false;
            const grid = scene.pixelGrid;
            const gridHeight = grid.height;
            const halfY = Math.floor(gridHeight / 2);
            let sandBelowMiddle = 0;

            grid.activeCells.forEach((cellData, key) => {
                const cy = cellData.y;
                if (cy > halfY) {
                    const cell = grid.getElement(cellData.x, cy);
                    if (cell && cell.name === 'sand') {
                        sandBelowMiddle++;
                    }
                }
            });

            return sandBelowMiddle > 0;
        });

        expect(sandBelow).toBe(true);
    });
});
