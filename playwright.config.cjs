// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    testMatch: '**/*.spec.cjs',
    timeout: 60000,
    expect: {
        timeout: 5000
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        video: 'on',
        screenshot: 'only-on-failure',
        // Use headed mode to see what's happening
        headless: false,
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                // Simulate touch device
                hasTouch: true,
                viewport: { width: 390, height: 844 }, // iPhone 14 size
            },
        },
    ],
    // Start dev server automatically
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 30000,
    },
});
