import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Theme', () => {
  test('theme page renders for a real project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Theme Test Project',
      slug: `theme-test-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/theme`);

    await expect(page.locator('h1')).toContainText('Theme');
  });

  test('theme page has color pickers', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Theme Colors Project',
      slug: `theme-colors-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/theme`);

    await expect(page.locator('input[type="color"]').first()).toBeVisible();
  });

  test('theme page has Save Theme button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Theme Save Project',
      slug: `theme-save-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/theme`);

    await expect(page.getByRole('button', { name: /save theme/i })).toBeVisible();
  });
});
