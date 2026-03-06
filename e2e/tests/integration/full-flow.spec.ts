import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../../fixtures/auth';

test.describe('Full Flow Integration', () => {
  test('complete admin flow: login -> dashboard -> projects -> create project', async ({ page }) => {
    // 1. Login
    await registerAndLogin(page);

    // 2. Should be on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // 3. Navigate to projects (use direct navigation to avoid mobile sidebar issues)
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');
    await expect(page.locator('h1')).toContainText('Projects');

    // 4. Go to create new project (navigate directly to avoid mobile sidebar issues)
    await page.goto('/projects/new');
    await expect(page).toHaveURL('/projects/new');

    // 5. Fill project form
    const slug = `e2e-full-flow-${Date.now()}`;
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.fill('input[name="slug"]', slug);
    await page.selectOption('select[name="mode"]', 'both');
    await page.fill('textarea[name="description"]', 'End-to-end test project');

    // Verify form values
    await expect(page.locator('input[name="name"]')).toHaveValue('E2E Test Project');
    await expect(page.locator('input[name="slug"]')).toHaveValue(slug);

    // 6. Submit and get redirected to project overview (UUID-based path)
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => /\/projects\/[0-9a-f-]{36}$/.test(new URL(url).pathname),
      { timeout: 30000 },
    );
    await expect(page.locator('h1')).toContainText('E2E Test Project');
  });

  test('public chat page renders for a created project', async ({ page }) => {
    // Setup auth and create project
    await registerAndLogin(page);

    const slug = `e2e-chat-${Date.now()}`;
    await page.goto('/projects/new');
    await page.fill('input[name="name"]', 'E2E Chat Test');
    await page.fill('input[name="slug"]', slug);
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => /\/projects\/[0-9a-f-]{36}$/.test(new URL(url).pathname),
      { timeout: 30000 },
    );

    // Now visit the public chat page
    await page.goto(`/c/${slug}`);

    // Chat page should render with welcome message
    await expect(page.getByText(/hello.*how can i help/i)).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('dashboard shows updated project count after creating a project', async ({ page }) => {
    await registerAndLogin(page);

    // Check initial count
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Create a project
    const slug = `e2e-count-${Date.now()}`;
    await page.goto('/projects/new');
    await page.fill('input[name="name"]', 'Count Test Project');
    await page.fill('input[name="slug"]', slug);
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => /\/projects\/[0-9a-f-]{36}$/.test(new URL(url).pathname),
      { timeout: 30000 },
    );

    // Go back to dashboard — the count should now be >= 1
    await page.goto('/dashboard');
    const countEl = page.locator('p.text-3xl.font-bold').first();
    const countText = await countEl.textContent();
    const count = parseInt(countText ?? '0', 10);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
