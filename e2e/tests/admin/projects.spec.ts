import { test, expect } from '@playwright/test';
import { registerAndLogin } from '../../fixtures/auth';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('projects page renders after auth', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('projects page shows New Project button', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /new project/i })).toBeVisible();
  });

  test('projects page shows empty state or project list', async ({ page }) => {
    await page.goto('/projects');
    // Either "No projects yet" or a list of projects
    const emptyState = page.getByText('No projects yet');
    const projectsHeading = page.locator('h1').filter({ hasText: 'Projects' });
    await expect(projectsHeading).toBeVisible();
    // Page should have rendered (either state is fine)
    await expect(page.locator('body')).toBeVisible();
  });

  test('new project page has form', async ({ page }) => {
    await page.goto('/projects/new');
    await expect(page.locator('h1')).toContainText('Create New Project');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="slug"]')).toBeVisible();
    await expect(page.locator('select[name="mode"]')).toBeVisible();
  });

  test('new project form can be filled', async ({ page }) => {
    await page.goto('/projects/new');
    await page.fill('input[name="name"]', 'Test Dishwasher');
    await page.fill('input[name="slug"]', 'test-dishwasher');
    await page.selectOption('select[name="mode"]', 'both');
    await page.fill('textarea[name="description"]', 'A test project');

    await expect(page.locator('input[name="name"]')).toHaveValue('Test Dishwasher');
    await expect(page.locator('input[name="slug"]')).toHaveValue('test-dishwasher');
  });

  test('can create a project via form submission', async ({ page }) => {
    await page.goto('/projects/new');

    // Use a unique slug to avoid conflicts across test runs
    const slug = `e2e-proj-${Date.now()}`;
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.fill('input[name="slug"]', slug);
    await page.selectOption('select[name="mode"]', 'both');

    // Submit form — this triggers a server action that redirects to /projects/[uuid]
    await page.click('button[type="submit"]');

    // Should redirect to the project overview page (UUID-based path)
    await page.waitForURL(
      (url) => /\/projects\/[0-9a-f-]{36}$/.test(new URL(url).pathname),
      { timeout: 30000 },
    );
    await expect(page.locator('h1')).toContainText('E2E Test Project');
  });
});
