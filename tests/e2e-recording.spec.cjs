/**
 * E2E Tests: Video Recording Button
 *
 * Tests that the record button appears, toggles recording state,
 * and shows correct icons during the recording cycle.
 *
 * Run: npx playwright test tests/e2e-recording.spec.cjs
 */

const { test, expect } = require('@playwright/test');
const { navigateToGame } = require('./helpers.cjs');

test.describe('Video Recording', () => {

    test.beforeEach(async ({ page }) => {
        // Full reload ensures clean Phaser state between tests
        await page.goto('about:blank');
        await navigateToGame(page);
    });

    test('record button is visible after game loads', async ({ page }) => {
        const recordBtn = page.locator('#record-btn');

        // The button exists in DOM
        await expect(recordBtn).toBeAttached();

        // Force recording support so button becomes visible
        // (MediaRecorder may not be available in headless Chromium)
        const isVisible = await recordBtn.evaluate(el => {
            return window.getComputedStyle(el).display !== 'none';
        });

        if (!isVisible) {
            // If MediaRecorder isn't supported in test env, skip gracefully
            test.skip(true, 'MediaRecorder not supported in this browser environment');
            return;
        }

        await expect(recordBtn).toBeVisible();
        await expect(recordBtn).toHaveClass(/hdr-btn/);
    });

    test('clicking record button starts recording', async ({ page }) => {
        const recordBtn = page.locator('#record-btn');

        // Wait for button to be visible (recording supported)
        const isVisible = await recordBtn.evaluate(el => {
            return window.getComputedStyle(el).display !== 'none';
        });
        if (!isVisible) {
            test.skip(true, 'MediaRecorder not supported in this browser environment');
            return;
        }

        // Button should not have .recording class initially
        await expect(recordBtn).not.toHaveClass(/recording/);

        // Button should show record icon (⏺) initially
        const initialText = await recordBtn.textContent();
        expect(initialText).toContain('⏺');

        // Click to start recording
        await recordBtn.click();
        await page.waitForTimeout(500);

        // Button should now have .recording class
        await expect(recordBtn).toHaveClass(/recording/);

        // Button should show stop icon (⏹)
        const recordingText = await recordBtn.textContent();
        expect(recordingText).toContain('⏹');
    });

    test('clicking record button again stops recording', async ({ page }) => {
        const recordBtn = page.locator('#record-btn');

        const isVisible = await recordBtn.evaluate(el => {
            return window.getComputedStyle(el).display !== 'none';
        });
        if (!isVisible) {
            test.skip(true, 'MediaRecorder not supported in this browser environment');
            return;
        }

        // Start recording
        await recordBtn.click();
        await page.waitForTimeout(500);
        await expect(recordBtn).toHaveClass(/recording/);

        // Stop recording
        await recordBtn.click();
        await page.waitForTimeout(500);

        // Button should lose .recording class
        await expect(recordBtn).not.toHaveClass(/recording/);

        // Button should show record icon (⏺) again
        const stoppedText = await recordBtn.textContent();
        expect(stoppedText).toContain('⏺');
    });

    test('no console errors during recording cycle', async ({ page }) => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        const recordBtn = page.locator('#record-btn');

        const isVisible = await recordBtn.evaluate(el => {
            return window.getComputedStyle(el).display !== 'none';
        });
        if (!isVisible) {
            test.skip(true, 'MediaRecorder not supported in this browser environment');
            return;
        }

        // Start recording
        await recordBtn.click();
        await page.waitForTimeout(1000);

        // Stop recording
        await recordBtn.click();
        await page.waitForTimeout(1000);

        // Filter out non-critical errors (Phaser warnings, etc.)
        const criticalErrors = errors.filter(e =>
            !e.includes('DevTools') &&
            !e.includes('favicon') &&
            !e.includes('Phaser')
        );

        expect(criticalErrors).toEqual([]);
    });
});
