const { defineConfig, devices } = require('playwright/test')
const path = require('path')

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'
const webServerCommand = process.env.E2E_WEB_SERVER_COMMAND || 'npm run dev'
const storageDriver = process.env.STORAGE_DRIVER || 'sqlite'
const sqliteDbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), '.careertrack', 'e2e.db')
const jwtSecret = process.env.JWT_SECRET || 'careertrack-e2e-jwt-secret-at-least-32-characters'
const totpEncryptionKey = process.env.TOTP_ENCRYPTION_KEY
  || 'careertrack-e2e-totp-encryption-key-at-least-32-characters'

// 测试夹具会直接写入 SQLite 以引导首个管理员，因此默认固定使用独立测试库，
// 避免本机 .env.local 中的 DATABASE_URL 让服务和夹具连接到不同数据库。
process.env.STORAGE_DRIVER = storageDriver
process.env.JWT_SECRET = jwtSecret
process.env.TOTP_ENCRYPTION_KEY = totpEncryptionKey
if (storageDriver === 'sqlite') {
  process.env.SQLITE_DB_PATH = sqliteDbPath
}

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
          STORAGE_DRIVER: storageDriver,
          ...(storageDriver === 'sqlite' ? { SQLITE_DB_PATH: sqliteDbPath } : {}),
          ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
          JWT_SECRET: jwtSecret,
          TOTP_ENCRYPTION_KEY: totpEncryptionKey,
        },
      },
})
