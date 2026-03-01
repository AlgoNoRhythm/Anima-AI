import { test as base, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3002' : 'http://localhost:3000');
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'demo@anima-ai.dev';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';
const TEST_NAME = 'Demo User';

/**
 * Registers the test user if no users exist yet, then logs in.
 * Idempotent: if registration fails (user already exists / disabled), we skip
 * and proceed straight to login.
 */
async function registerAndLogin(page: Page) {
  // Attempt registration via API (idempotent — 403 means already registered)
  try {
    await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
      headers: { 'Content-Type': 'application/json' },
    });
    // We don't care about the response status: 201 = created, 403 = already exists
  } catch {
    // Network error during registration — ignore and try logging in anyway
  }

  // Log in via the login form
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard (or projects)
  await page.waitForURL(/\/(dashboard|projects)/, { timeout: 15000 });
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await registerAndLogin(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { registerAndLogin };
