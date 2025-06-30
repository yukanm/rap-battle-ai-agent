import { defineConfig, devices } from '@playwright/test'

/**
 * E2E Test Configuration for AI Rap Battle Application
 * 包括的なエンドツーエンドテスト設定
 */
export default defineConfig({
  testDir: './e2e-tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3456',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action (e.g., click, fill) */
    actionTimeout: 10000,
    
    /* Global timeout for navigation actions */
    navigationTimeout: 30000,
  },

  /* Global test timeout - important for performance verification */
  timeout: 60000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 15000
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:3456',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev:backend', 
      url: 'http://localhost:8456/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e-tests/global-setup.ts'),
  globalTeardown: require.resolve('./e2e-tests/global-teardown.ts'),
})