import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../../fixtures/auth';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:3002' : 'http://localhost:3000');
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'demo@anima-ai.dev';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';

test.describe('Authentication', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Anima AI');
  });

  test('landing page has Get to Dashboard link', async ({ page }) => {
    await page.goto('/');
    // The landing page has a "Go to Dashboard" link
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Anima AI');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('can register and login', async ({ page }) => {
    // Register (idempotent)
    try {
      await page.request.post(`${BASE_URL}/api/auth/register`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Demo User' },
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // ignore
    }

    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|projects)/, { timeout: 15000 });
    // Should be on the dashboard or projects page after login
    await expect(page.locator('h1')).toBeVisible();
  });

  test('authenticated user can reach dashboard', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('dashboard shows stats cards', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Total Projects')).toBeVisible();
    await expect(page.getByText('Total Documents')).toBeVisible();
    // "Chat Sessions" heading - use a more specific selector to avoid ambiguity
    await expect(page.locator('h3').filter({ hasText: 'Chat Sessions' })).toBeVisible();
  });
});
