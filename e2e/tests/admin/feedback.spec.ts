import { test, expect } from '@playwright/test';
import { setupAuthAndProject } from '../../fixtures/project-helpers';

test.describe('Feedback Admin', () => {
  test('feedback page renders for a real project', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Feedback Test Project',
      slug: `fb-test-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/feedback`);

    await expect(page.locator('h1')).toContainText('Feedback');
  });

  test('feedback page has enable toggle', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Feedback Toggle Project',
      slug: `fb-toggle-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/feedback`);

    // The enable toggle label should be visible
    await expect(page.getByText('Enable Feedback Survey')).toBeVisible();
  });

  test('feedback page has save button', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Feedback Save Project',
      slug: `fb-save-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/feedback`);

    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
  });

  test('feedback page shows preview', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Feedback Preview Project',
      slug: `fb-preview-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}/feedback`);

    await expect(page.getByText('Enable feedback to see preview')).toBeVisible();
  });

  test('feedback link appears in project navigation', async ({ page }) => {
    const { projectId } = await setupAuthAndProject(page, {
      name: 'Feedback Nav Project',
      slug: `fb-nav-${Date.now()}`,
    });

    await page.goto(`/projects/${projectId}`);

    await expect(page.getByRole('link', { name: /feedback/i })).toBeVisible();
  });
});
