/**
 * E2E Tests: Video Recording & Header Button Focus
 *
 * Tests that the record button works, recording produces output,
 * and header buttons don't break Phaser canvas drawing.
 *
 * Run: npx playwright test tests/e2e-recording.spec.cjs
 */

const { test, expect } = require('@playwright/test');
const { navigateToGame, drawLine, getParticleCount } = require('./helpers.cjs');

/** Check if record button is visible (MediaRecorder supported) */
async function isRecordingSupported(page) {
    const recordBtn = page.locator('#record-btn');
    const isVisible = await recordBtn.evaluate(el => {
        return window.getComputedStyle(el).display !== 'none';
    });
    return isVisible;
}

test.describe('Video Recording', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await navigateToGame(page);
    });

    test('record button is visible after game loads', async ({ page }) => {
        const recordBtn = page.locator('#record-btn');
        await expect(recordBtn).toBeAttached();

        if (!await isRecordingSupported(page)) {
            test.skip(true, 'MediaRecorder not supported in this browser environment');
            return;
        }

        await expect(recordBtn).toBeVisible();
        await expect(recordBtn).toHaveClass(/hdr-btn/);
    });

    test('clicking record button starts recording', async ({ page }) => {
        if (!await isRecordingSupported(page)) {
            test.skip(true, 'MediaRecorder not supported');
            return;
        }

        const recordBtn = page.locator('#record-btn');
        await expect(recordBtn).not.toHaveClass(/recording/);

        const initialText = await recordBtn.textContent();
        expect(initialText).toContain('⏺');

        await recordBtn.click();
        await page.waitForTimeout(500);

        await expect(recordBtn).toHaveClass(/recording/);
        const recordingText = await recordBtn.textContent();
        expect(recordingText).toContain('⏹');
    });

    test('clicking record button again stops recording', async ({ page }) => {
        if (!await isRecordingSupported(page)) {
            test.skip(true, 'MediaRecorder not supported');
            return;
        }

        const recordBtn = page.locator('#record-btn');

        // Start recording
        await recordBtn.click();
        await page.waitForTimeout(500);
        await expect(recordBtn).toHaveClass(/recording/);

        // Stop recording
        await recordBtn.click();
        await page.waitForTimeout(500);

        await expect(recordBtn).not.toHaveClass(/recording/);
        const stoppedText = await recordBtn.textContent();
        expect(stoppedText).toContain('⏺');
    });

    test('no console errors during recording cycle', async ({ page }) => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        if (!await isRecordingSupported(page)) {
            test.skip(true, 'MediaRecorder not supported');
            return;
        }

        const recordBtn = page.locator('#record-btn');
        await recordBtn.click();
        await page.waitForTimeout(1000);
        await recordBtn.click();
        await page.waitForTimeout(1000);

        const criticalErrors = errors.filter(e =>
            !e.includes('DevTools') &&
            !e.includes('favicon') &&
            !e.includes('Phaser')
        );

        expect(criticalErrors).toEqual([]);
    });

    test('recording produces a non-empty video blob', async ({ page }) => {
        if (!await isRecordingSupported(page)) {
            test.skip(true, 'MediaRecorder not supported');
            return;
        }

        // Draw some content so the recording has visible frames
        await drawLine(page, 0.3, 0.4, 0.7, 0.4);
        await page.waitForTimeout(300);

        // Intercept the download to capture the blob size
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

        const recordBtn = page.locator('#record-btn');

        // Start recording
        await recordBtn.click();
        await page.waitForTimeout(2000); // Record for 2 seconds

        // Stop recording
        await recordBtn.click();

        // Wait for the download to be triggered
        const download = await downloadPromise;

        // Verify the file has a video extension
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/pixellence-\d+\.(mp4|webm)$/);

        // Save and check file size (should be > 0 bytes for a real recording)
        const path = await download.path();
        const fs = require('fs');
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(0);
    });
});

test.describe('Header Button Focus (drawing regression)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('about:blank');
        await navigateToGame(page);
    });

    test('drawing works after clicking settings button', async ({ page }) => {
        // First verify drawing works normally
        await drawLine(page, 0.3, 0.3, 0.5, 0.3);
        await page.waitForTimeout(300);
        const beforeClick = await getParticleCount(page);
        expect(beforeClick).toBeGreaterThan(0);

        // Click the settings button (this used to steal focus and break drawing)
        const settingsBtn = page.locator('#settings-btn');
        await settingsBtn.click();
        await page.waitForTimeout(300);

        // Close settings overlay
        const closeBtn = page.locator('#settings-close');
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
        }

        // Drawing should still work after closing settings
        await drawLine(page, 0.3, 0.6, 0.5, 0.6);
        await page.waitForTimeout(300);
        const afterClick = await getParticleCount(page);
        expect(afterClick).toBeGreaterThan(beforeClick);
    });

    test('drawing works after clicking speed buttons', async ({ page }) => {
        // Draw initial content
        await drawLine(page, 0.3, 0.3, 0.5, 0.3);
        await page.waitForTimeout(300);
        const beforeClick = await getParticleCount(page);
        expect(beforeClick).toBeGreaterThan(0);

        // Click speed up, then speed down
        const speedUp = page.locator('#speed-up');
        const speedDown = page.locator('#speed-down');
        await speedUp.click();
        await page.waitForTimeout(200);
        await speedDown.click();
        await page.waitForTimeout(200);

        // Drawing should still work
        await drawLine(page, 0.3, 0.6, 0.5, 0.6);
        await page.waitForTimeout(300);
        const afterClick = await getParticleCount(page);
        expect(afterClick).toBeGreaterThan(beforeClick);
    });

    test('drawing works after clicking record button', async ({ page }) => {
        if (!await isRecordingSupported(page)) {
            test.skip(true, 'MediaRecorder not supported');
            return;
        }

        // Draw initial content
        await drawLine(page, 0.3, 0.3, 0.5, 0.3);
        await page.waitForTimeout(300);
        const beforeClick = await getParticleCount(page);
        expect(beforeClick).toBeGreaterThan(0);

        // Click record button (start), then click again (stop)
        const recordBtn = page.locator('#record-btn');
        await recordBtn.click();
        await page.waitForTimeout(500);
        await recordBtn.click();
        await page.waitForTimeout(500);

        // Drawing should still work after recording toggle
        await drawLine(page, 0.3, 0.6, 0.5, 0.6);
        await page.waitForTimeout(300);
        const afterClick = await getParticleCount(page);
        expect(afterClick).toBeGreaterThan(beforeClick);
    });

    test('header buttons lose focus after click', async ({ page }) => {
        // Click settings button
        const settingsBtn = page.locator('#settings-btn');
        await settingsBtn.click();
        await page.waitForTimeout(200);

        // Verify the button is NOT the active element (focus was released)
        const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
        const activeId = await page.evaluate(() => document.activeElement?.id);
        // Active element should NOT be settings-btn
        expect(activeId).not.toBe('settings-btn');
    });
});
