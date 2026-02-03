/**
 * E2E Test: Modal closes but touch events stop working
 * 
 * Bug: After closing the purchase modal, the Phaser canvas stops
 * receiving pointer/touch events - user can't draw anymore.
 * 
 * Test steps:
 * 1. Load game, skip to GameScene
 * 2. Draw sand on canvas (verify drawing works)
 * 3. Click a locked premium element to open purchase modal
 * 4. Close modal via "Not Now" button
 * 5. Switch to water element
 * 6. Draw water on canvas
 * 7. Verify water particles exist (if not = bug confirmed)
 */

const { test, expect } = require('@playwright/test');

test.describe('Purchase Modal Touch Bug', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to local dev server
        await page.goto('http://localhost:3000');
        
        // Wait for Phaser to initialize
        await page.waitForFunction(() => window.__pixelboxGame !== undefined, { timeout: 15000 });
        
        // Wait for MainMenuScene to be ready (buttons are Phaser canvas, not DOM)
        await page.waitForFunction(() => {
            const game = window.__pixelboxGame;
            return game?.scene?.scenes?.some(s => s.sys?.settings?.key === 'MainMenuScene' && s.sys?.settings?.active);
        }, { timeout: 10000 });
        
        await page.waitForTimeout(500);
        
        // Click "New Game" button - it's in the center, ~46% from top
        // The button is rendered as Phaser graphics at specific coordinates
        const canvas = page.locator('#game-container canvas');
        const box = await canvas.boundingBox();
        const newGameY = box.y + box.height * 0.46; // New Game button position
        const centerX = box.x + box.width / 2;
        
        await page.mouse.click(centerX, newGameY);
        
        // Wait for GameScene to be ready
        await page.waitForFunction(() => window.__pixellenceScene?.sceneReady === true, { timeout: 15000 });
        
        // Small delay for UI to settle
        await page.waitForTimeout(500);
    });

    test('drawing should work after closing purchase modal', async ({ page }) => {
        const canvas = page.locator('#game-container canvas');
        const canvasBox = await canvas.boundingBox();
        
        // Center of canvas for drawing
        const centerX = canvasBox.x + canvasBox.width / 2;
        const centerY = canvasBox.y + canvasBox.height / 2;
        
        // STEP 1: Verify sand is selected by default and draw some
        console.log('Step 1: Drawing sand...');
        await page.mouse.move(centerX - 50, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX - 30, centerY, { steps: 5 });
        await page.mouse.up();
        
        // Wait for physics to process
        await page.waitForTimeout(300);
        
        // Get initial particle count
        const initialCount = await page.evaluate(() => window.__pixellenceScene?.pixelGrid?.particleCount || 0);
        console.log(`Initial particle count after sand: ${initialCount}`);
        expect(initialCount).toBeGreaterThan(0);
        
        // STEP 2: Click a locked premium element to open modal
        console.log('Step 2: Opening purchase modal...');
        
        // Find a locked premium element button (e.g., lava, oil, etc.)
        const lockedElement = page.locator('.element-btn.premium-element.locked').first();
        const isLocked = await lockedElement.count() > 0;
        
        if (!isLocked) {
            console.log('No locked elements found - premium already unlocked, skipping modal test');
            test.skip();
            return;
        }
        
        await lockedElement.click();
        
        // Wait for modal to appear
        await page.waitForSelector('#unlock-overlay[style*="display: flex"]', { timeout: 5000 });
        console.log('Modal opened');
        
        // STEP 3: Close modal via "Not Now" button
        console.log('Step 3: Closing modal...');
        await page.click('#unlock-modal-cancel');
        
        // Wait for modal to be hidden (use state: 'hidden' since display is set via rAF)
        await page.waitForSelector('#unlock-overlay', { state: 'hidden', timeout: 5000 });
        console.log('Modal closed');
        
        // Extra wait for any deferred operations (rAF, setTimeout)
        await page.waitForTimeout(300);
        
        // STEP 4: Select water element
        console.log('Step 4: Selecting water...');
        const waterBtn = page.locator('.element-btn[data-element="water"]');
        await waterBtn.click();
        
        // Verify water is selected
        await expect(waterBtn).toHaveClass(/active/);
        
        // STEP 5: Draw water on canvas (different location)
        console.log('Step 5: Drawing water...');
        await page.mouse.move(centerX + 50, centerY - 30);
        await page.mouse.down();
        await page.mouse.move(centerX + 70, centerY - 30, { steps: 5 });
        await page.mouse.up();
        
        // Wait for physics
        await page.waitForTimeout(500);
        
        // STEP 6: Verify water was drawn
        console.log('Step 6: Verifying water exists...');
        
        // Check if there are water particles
        const hasWater = await page.evaluate(() => {
            const scene = window.__pixellenceScene;
            if (!scene || !scene.pixelGrid) return false;
            
            // Scan grid for water elements
            let waterCount = 0;
            const grid = scene.pixelGrid.grid;
            for (let y = 0; y < grid.length; y++) {
                for (let x = 0; x < grid[y].length; x++) {
                    const cell = grid[y][x];
                    if (cell && cell.element && cell.element.name === 'water') {
                        waterCount++;
                    }
                }
            }
            console.log(`Water particles found: ${waterCount}`);
            return waterCount > 0;
        });
        
        const finalCount = await page.evaluate(() => window.__pixellenceScene?.pixelGrid?.particleCount || 0);
        console.log(`Final particle count: ${finalCount}`);
        
        // THE ACTUAL TEST: Water should exist if drawing worked after modal close
        expect(hasWater).toBe(true);
    });

    test('drawing should work after clicking overlay background to close', async ({ page }) => {
        const canvas = page.locator('#game-container canvas');
        const canvasBox = await canvas.boundingBox();
        const centerX = canvasBox.x + canvasBox.width / 2;
        const centerY = canvasBox.y + canvasBox.height / 2;
        
        // Open modal
        const lockedElement = page.locator('.element-btn.premium-element.locked').first();
        if (await lockedElement.count() === 0) {
            test.skip();
            return;
        }
        await lockedElement.click();
        await page.waitForSelector('#unlock-overlay[style*="display: flex"]', { timeout: 5000 });
        
        // Close by clicking overlay background (not button)
        const overlay = page.locator('#unlock-overlay');
        const overlayBox = await overlay.boundingBox();
        // Click in corner (outside the modal dialog)
        await page.mouse.click(overlayBox.x + 10, overlayBox.y + 10);
        
        await page.waitForSelector('#unlock-overlay', { state: 'hidden', timeout: 5000 });
        await page.waitForTimeout(300);
        
        // Try to draw
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 20, centerY, { steps: 5 });
        await page.mouse.up();
        
        await page.waitForTimeout(300);
        
        // Verify drawing worked
        const particleCount = await page.evaluate(() => window.__pixellenceScene?.pixelGrid?.particleCount || 0);
        expect(particleCount).toBeGreaterThan(0);
    });
});
