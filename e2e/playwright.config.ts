import { defineConfig, devices } from '@playwright/test';

// In CI, servers start on port 3002 (see webServer below). Locally, use 3000 (pnpm dev).
const baseURL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3002' : 'http://localhost:3000');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  timeout: 30000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: [
    {
      command: process.env.CI
        ? 'pnpm --filter @anima-ai/web dev -p 3002'
        : 'pnpm --filter @anima-ai/web dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @anima-ai/chat-api dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      cwd: '..',
    },
  ],
});
