const { defineConfig, devices } = require('playwright/test')

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'
const webServerCommand = process.env.E2E_WEB_SERVER_COMMAND || 'npm run dev'

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 90 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  workers: 1,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: webServerCommand,
        url: `${baseURL}/auth/login`,
        reuseExistingServer: true,
        timeout: 120 * 1000,
        env: {
          PORT: new URL(baseURL).port || '3000',
        },
      },
})
