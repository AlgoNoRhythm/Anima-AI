import { test as base, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3002' : 'http://localhost:3000');
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'demo@anima-ai.dev';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';
const TEST_NAME = 'Demo User';

/**
 * Registers the test user if no users exist yet, then logs in.
 * Idempotent: if registration fails (user already exists / disabled), we skip
 * and proceed straight to login.
 *
 * Retries login up to 2 times to handle parallel worker load on the dev server.
 */
async function registerAndLogin(page: Page, attempt = 0) {
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

  try {
    // Log in via the login form
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the form inputs to be ready before filling
    await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (or projects)
    await page.waitForURL(/\/(dashboard|projects)/, { timeout: 25000 });
  } catch (err) {
    if (attempt < 2) {
      // Dev server may be slow under parallel load — retry after a brief pause
      await page.waitForTimeout(2000 * (attempt + 1));
      return registerAndLogin(page, attempt + 1);
    }
    throw err;
  }
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await registerAndLogin(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { registerAndLogin };
