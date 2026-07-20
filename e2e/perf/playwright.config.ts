/**
 * 性能度量专用 Playwright 配置
 *
 * 仅匹配 `*.perf.ts` 文件，与 e2e/playwright.config.ts（匹配 *.spec.ts）互不干扰。
 * 关闭 retries / fullyParallel，便于多次运行取中位数。
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.perf.ts',
  timeout: 120000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: '../playwright-perf-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
